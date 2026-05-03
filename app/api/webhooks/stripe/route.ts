import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import {
  getStripeClient,
  mapStripeSubscriptionToLocalStatus,
  premiumSubscriptionIsPaying,
} from '@/lib/payments/stripe';

export const runtime = 'nodejs';

function subscriptionTrialEndsIso(sub: Stripe.Subscription): string | null {
  const end = sub.trial_end;
  if (!end) return null;
  return new Date(end * 1000).toISOString();
}

async function syncLocalSpotSubscriptionFromCheckout(session: Stripe.Checkout.Session) {
  const localSpotId = session.metadata?.localSpotId?.trim();
  if (!localSpotId || session.mode !== 'subscription') return;

  const stripe = getStripeClient();
  const subRef = session.subscription;
  const subId = typeof subRef === 'string' ? subRef : subRef?.id;
  if (!subId) return;

  const sub = await stripe.subscriptions.retrieve(subId);
  const customerRef = sub.customer;
  const customerId = typeof customerRef === 'string' ? customerRef : customerRef.id;

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('local_spots')
    .update({
      stripe_customer_id: customerId,
      subscription_status: mapStripeSubscriptionToLocalStatus(sub.status),
      trial_ends_at: subscriptionTrialEndsIso(sub),
    })
    .eq('id', localSpotId);

  if (error) throw new Error(error.message);
}

async function syncPremiumProfileFromCheckout(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || session.metadata?.tjw_premium !== '1') return;

  const profileId = session.metadata?.profileId?.trim();
  const plan = session.metadata?.premiumPlan?.trim();
  const subRef = session.subscription;
  const subId = typeof subRef === 'string' ? subRef : subRef?.id;
  if (!profileId || !plan || !subId) return;

  const stripe = getStripeClient();
  const sub = await stripe.subscriptions.retrieve(subId);
  const paying = premiumSubscriptionIsPaying(sub.status);

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('profiles')
    .update({
      is_premium: paying,
      premium_plan: plan,
      premium_stripe_subscription_id: sub.id,
    })
    .eq('id', profileId);

  if (error) throw new Error(error.message);
}

async function syncPremiumFromSubscription(sub: Stripe.Subscription) {
  if (sub.metadata?.tjw_premium !== '1') return;

  const profileId = sub.metadata?.profileId?.trim();
  if (!profileId) return;

  const paying = premiumSubscriptionIsPaying(sub.status);
  const plan = typeof sub.metadata?.premiumPlan === 'string' ? sub.metadata.premiumPlan.trim() : null;

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('profiles')
    .update({
      is_premium: paying,
      ...(plan ? { premium_plan: plan } : {}),
      premium_stripe_subscription_id: sub.id,
    })
    .eq('id', profileId);

  if (error) throw new Error(error.message);
}

async function syncPremiumSubscriptionDeleted(sub: Stripe.Subscription) {
  if (sub.metadata?.tjw_premium !== '1') return;

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('profiles')
    .update({
      is_premium: false,
      premium_plan: null,
      premium_stripe_subscription_id: null,
    })
    .eq('premium_stripe_subscription_id', sub.id);

  if (error) throw new Error(error.message);
}

async function syncLocalSpotSubscriptionRows(sub: Stripe.Subscription) {
  const customerRef = sub.customer;
  const customerId = typeof customerRef === 'string' ? customerRef : customerRef.id;
  if (!customerId) return;

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('local_spots')
    .update({
      subscription_status: mapStripeSubscriptionToLocalStatus(sub.status),
      trial_ends_at: subscriptionTrialEndsIso(sub),
    })
    .eq('stripe_customer_id', customerId);

  if (error) throw new Error(error.message);
}

async function syncOrderStatus(input: {
  orderId: string;
  paymentStatus: string;
  orderStatus: 'paid' | 'cancelled';
  eventId: string;
  sessionId: string;
}) {
  const admin = createServiceRoleClient();
  const { data: currentIntent, error: currentIntentError } = await admin
    .from('order_payment_intents')
    .select('status, metadata')
    .eq('order_id', input.orderId)
    .eq('provider', 'stripe')
    .single();
  if (currentIntentError) throw new Error(currentIntentError.message);

  const metadata =
    currentIntent?.metadata && typeof currentIntent.metadata === 'object' ? currentIntent.metadata : {};
  const prevEventId =
    metadata && 'webhookEventId' in metadata && typeof metadata.webhookEventId === 'string'
      ? metadata.webhookEventId
      : null;
  if (prevEventId === input.eventId) {
    return;
  }

  if (input.orderStatus === 'cancelled' && currentIntent?.status === 'completed') {
    return;
  }

  const { error: paymentError } = await admin
    .from('order_payment_intents')
    .update({
      status: input.paymentStatus,
      external_id: input.sessionId,
      metadata: {
        ...(metadata as Record<string, unknown>),
        sessionId: input.sessionId,
        webhookEventId: input.eventId,
      },
    })
    .eq('order_id', input.orderId)
    .eq('provider', 'stripe');
  if (paymentError) throw new Error(paymentError.message);

  const { error: orderError } = await admin
    .from('orders')
    .update({
      status: input.orderStatus,
    })
    .eq('id', input.orderId);
  if (orderError) throw new Error(orderError.message);

  const { error: eventError } = await admin.from('order_status_events').insert({
    order_id: input.orderId,
    status: input.orderStatus,
    actor_profile_id: null,
    note: `stripe_webhook:${input.eventId}`,
  });
  if (eventError) throw new Error(eventError.message);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET missing' }, { status: 500 });
  }
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid_webhook';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.metadata?.localSpotId) {
        await syncLocalSpotSubscriptionFromCheckout(session);
      }
      if (session.mode === 'subscription' && session.metadata?.tjw_premium === '1') {
        await syncPremiumProfileFromCheckout(session);
      }
      const orderId = session.metadata?.orderId;
      if (orderId && session.payment_status === 'paid') {
        await syncOrderStatus({
          orderId,
          paymentStatus: 'completed',
          orderStatus: 'paid',
          eventId: event.id,
          sessionId: session.id,
        });
      }
    } else if (event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.metadata?.tjw_premium === '1') {
        await syncPremiumProfileFromCheckout(session);
      }
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await syncOrderStatus({
          orderId,
          paymentStatus: 'completed',
          orderStatus: 'paid',
          eventId: event.id,
          sessionId: session.id,
        });
      }
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await syncOrderStatus({
          orderId,
          paymentStatus: 'failed',
          orderStatus: 'cancelled',
          eventId: event.id,
          sessionId: session.id,
        });
      }
    } else if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      await syncPremiumFromSubscription(sub);
      await syncLocalSpotSubscriptionRows(sub);
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      await syncPremiumSubscriptionDeleted(sub);
      await syncLocalSpotSubscriptionRows(sub);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sync_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
