import 'server-only';

import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY missing');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2026-03-25.dahlia',
    });
  }
  return stripeClient;
}

export async function createStripeCheckoutSession(input: {
  orderId: string;
  amountThb: number;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  idempotencyKey?: string;
}) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'thb',
          unit_amount: Math.round(input.amountThb * 100),
          product_data: { name: `ThaiJaWorld Order ${input.orderId}` },
        },
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail ?? undefined,
    metadata: { orderId: input.orderId },
  }, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined);
  return session;
}

export type LocalSpotSubscriptionStatus = 'none' | 'trialing' | 'active' | 'canceled';

export function mapStripeSubscriptionToLocalStatus(
  status: Stripe.Subscription.Status,
): LocalSpotSubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
    case 'past_due':
      return 'active';
    case 'canceled':
      return 'canceled';
    default:
      return 'none';
  }
}

/** 로컬 가게 B2B SaaS: 30일 무료 체험 후 월 구독 자동 과금(카드 등록 Checkout). */
export async function createB2bLocalSubscriptionCheckoutSession(input: {
  priceId: string;
  localSpotId: string;
  successUrl: string;
  cancelUrl: string;
  stripeCustomerId?: string | null;
  customerEmail?: string;
  idempotencyKey?: string;
}) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      line_items: [{ price: input.priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 30,
        metadata: { localSpotId: input.localSpotId },
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.localSpotId,
      metadata: { localSpotId: input.localSpotId },
      ...(input.stripeCustomerId?.trim()
        ? { customer: input.stripeCustomerId.trim() }
        : { customer_email: input.customerEmail?.trim() || undefined }),
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  );
  return session;
}

export async function createStripeBillingPortalSession(input: {
  customerId: string;
  returnUrl: string;
}) {
  const stripe = getStripeClient();
  return stripe.billingPortal.sessions.create({
    customer: input.customerId.trim(),
    return_url: input.returnUrl,
  });
}
