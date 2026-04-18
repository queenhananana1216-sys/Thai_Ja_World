import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/lib/payments/stripe';

export const runtime = 'nodejs';

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
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sync_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
