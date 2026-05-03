import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createCoinbaseCharge } from '@/lib/payments/crypto';
import { isPremiumPlanId } from '@/lib/payments/premiumPlans';
import { createPremiumSubscriptionCheckoutSession, createStripeCheckoutSession } from '@/lib/payments/stripe';
import { featureFlags } from '@/lib/flags';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

type CheckoutBody = {
  orderId?: string;
  /** 소비자 프리미엄 월 구독 — 지정 시 orderId와 함께 보내면 안 됨 */
  premiumPlan?: string;
  method?: 'card' | 'crypto';
  successUrl?: string;
  cancelUrl?: string;
};

function resolveCheckoutUrl(input: string | undefined, fallback: string, baseOrigin: string): string {
  const raw = input?.trim();
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw, baseOrigin);
    if (!/^https?:$/.test(parsed.protocol)) return fallback;
    if (parsed.origin !== baseOrigin) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const premiumRaw = typeof body.premiumPlan === 'string' ? body.premiumPlan.trim().toLowerCase() : '';

  if (premiumRaw && orderId) {
    return NextResponse.json({ error: 'premium_and_order_mutually_exclusive' }, { status: 400 });
  }

  if (premiumRaw) {
    if (!featureFlags.premiumSubscriptionsV1) {
      return NextResponse.json({ error: 'premium_subscriptions_disabled' }, { status: 503 });
    }
    if (!isPremiumPlanId(premiumRaw)) {
      return NextResponse.json({ error: 'invalid_premium_plan' }, { status: 400 });
    }

    const supabasePremium = await createServerSupabaseAuthClient();
    const {
      data: { user: premiumUser },
    } = await supabasePremium.auth.getUser();
    if (!premiumUser) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://127.0.0.1:3000';
    const successFallback = `${base}/premium?checkout=success`;
    const cancelFallback = `${base}/premium?checkout=cancel`;
    const successUrl = resolveCheckoutUrl(body.successUrl, successFallback, base);
    const cancelUrl = resolveCheckoutUrl(body.cancelUrl, cancelFallback, base);

    try {
      const session = await createPremiumSubscriptionCheckoutSession({
        profileId: premiumUser.id,
        planId: premiumRaw,
        successUrl,
        cancelUrl,
        customerEmail: premiumUser.email ?? undefined,
        idempotencyKey: `premium:${premiumUser.id}:${premiumRaw}:${randomUUID()}`,
      });
      return NextResponse.json({
        ok: true,
        provider: 'stripe',
        kind: 'premium_subscription',
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'stripe_premium_checkout_failed';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!featureFlags.paymentsV1) {
    return NextResponse.json({ error: 'payments_feature_disabled' }, { status: 503 });
  }

  if (!orderId) return NextResponse.json({ error: 'orderId_required' }, { status: 400 });

  const method = body.method === 'crypto' ? 'crypto' : 'card';
  if (method === 'crypto' && !featureFlags.cryptoPaymentsV1) {
    return NextResponse.json({ error: 'crypto_payments_disabled' }, { status: 503 });
  }

  const supabase = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, customer_id, total_amount_thb')
    .eq('id', orderId)
    .single();
  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? 'order_not_found' }, { status: 404 });
  }
  if (order.customer_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://127.0.0.1:3000';
  const successFallback = `${base}/orders/${orderId}?pay=success`;
  const cancelFallback = `${base}/orders/${orderId}?pay=cancel`;
  const successUrl = resolveCheckoutUrl(body.successUrl, successFallback, base);
  const cancelUrl = resolveCheckoutUrl(body.cancelUrl, cancelFallback, base);
  const amountThb = Number(order.total_amount_thb ?? 0);

  if (!(amountThb > 0)) {
    return NextResponse.json({ error: 'invalid_order_amount' }, { status: 400 });
  }

  if (method === 'card') {
    try {
      const session = await createStripeCheckoutSession({
        orderId,
        amountThb,
        successUrl,
        cancelUrl,
        customerEmail: user.email ?? undefined,
        idempotencyKey: `checkout-${orderId}-${amountThb}`,
      });
      const paymentPayload = {
        order_id: orderId,
        provider: 'stripe',
        status: 'pending',
        amount_thb: amountThb,
        external_id: session.id,
        checkout_url: session.url ?? null,
        metadata: { sessionId: session.id, checkoutStartedAt: new Date().toISOString() },
      };
      let { error: paymentIntentError } = await supabase.from('order_payment_intents').upsert(
        {
          ...paymentPayload,
        },
        { onConflict: 'order_id' },
      );
      if (paymentIntentError) {
        const fallbackUpdate = await supabase
          .from('order_payment_intents')
          .update({
            status: paymentPayload.status,
            amount_thb: paymentPayload.amount_thb,
            external_id: paymentPayload.external_id,
            checkout_url: paymentPayload.checkout_url,
            metadata: paymentPayload.metadata,
          })
          .eq('order_id', orderId)
          .eq('provider', 'stripe');
        paymentIntentError = fallbackUpdate.error ?? null;
      }
      if (paymentIntentError) {
        return NextResponse.json({ error: paymentIntentError.message }, { status: 500 });
      }
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_method: 'card',
          payment_provider: 'stripe',
          payment_ref: session.id,
        })
        .eq('id', orderId);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      await supabase.from('order_status_events').insert({
        order_id: orderId,
        status: 'pending',
        actor_profile_id: user.id,
        note: 'checkout_started:stripe',
      });
      return NextResponse.json({
        ok: true,
        provider: 'stripe',
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'stripe_checkout_failed';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const charge = await createCoinbaseCharge({
      orderId,
      amountThb,
      successUrl,
      cancelUrl,
    });
    const paymentPayload = {
      order_id: orderId,
      provider: 'coinbase',
      status: charge.status,
      amount_thb: amountThb,
      external_id: charge.id,
      checkout_url: charge.hostedUrl,
      metadata: { chargeId: charge.id, checkoutStartedAt: new Date().toISOString() },
    };
    let { error: paymentIntentError } = await supabase.from('order_payment_intents').upsert(
      {
        ...paymentPayload,
      },
      { onConflict: 'order_id' },
    );
    if (paymentIntentError) {
      const fallbackUpdate = await supabase
        .from('order_payment_intents')
        .update({
          status: paymentPayload.status,
          amount_thb: paymentPayload.amount_thb,
          external_id: paymentPayload.external_id,
          checkout_url: paymentPayload.checkout_url,
          metadata: paymentPayload.metadata,
        })
        .eq('order_id', orderId)
        .eq('provider', 'coinbase');
      paymentIntentError = fallbackUpdate.error ?? null;
    }
    if (paymentIntentError) {
      return NextResponse.json({ error: paymentIntentError.message }, { status: 500 });
    }
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_method: 'crypto',
        payment_provider: 'coinbase',
        payment_ref: charge.id,
      })
      .eq('id', orderId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    await supabase.from('order_status_events').insert({
      order_id: orderId,
      status: 'pending',
      actor_profile_id: user.id,
      note: 'checkout_started:coinbase',
    });
    return NextResponse.json({
      ok: true,
      provider: 'coinbase',
      checkoutUrl: charge.hostedUrl,
      chargeId: charge.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'coinbase_checkout_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
