import 'server-only';

import Stripe from 'stripe';
import type { PremiumPlanId } from '@/lib/payments/premiumPlans';
import { PREMIUM_PLANS } from '@/lib/payments/premiumPlans';
import type { ThaiTopupId } from '@/lib/payments/thaiPackages';
import { THAI_TOPUP_PACKS } from '@/lib/payments/thaiPackages';

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

/** 소비자 타이(THAI) 포인트 충전 — 일회 결제(THB). 웹훅 메타데이터로 금액·크레딧 검증 */
export async function createThaiTopupCheckoutSession(input: {
  profileId: string;
  packId: ThaiTopupId;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  idempotencyKey?: string;
}) {
  const pack = THAI_TOPUP_PACKS[input.packId];
  const stripe = getStripeClient();
  const meta = {
    tjw_thai_topup: '1',
    profileId: input.profileId,
    thai_pack: pack.id,
    thaiCredits: String(pack.thaiCredits),
    priceThb: String(pack.amountThb),
  } as const;
  return stripe.checkout.sessions.create(
    {
      mode: 'payment',
      client_reference_id: input.profileId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'thb',
            unit_amount: Math.round(pack.amountThb * 100),
            product_data: {
              name: `살자 타이(THAI) 충전 · ${pack.label}`,
              description: `+${pack.thaiCredits.toLocaleString()} 타이 크레딧 (${pack.tagline})`,
            },
          },
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail?.trim() || undefined,
      metadata: { ...meta },
      payment_intent_data: {
        metadata: { ...meta },
      },
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  );
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
          product_data: { name: `LivingInThai Order ${input.orderId}` },
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

/** 소비자 프리미엄 구독이 유료 혜택으로 간주되는 Stripe 상태 */
export function premiumSubscriptionIsPaying(status: Stripe.Subscription.Status): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

export async function createPremiumSubscriptionCheckoutSession(input: {
  profileId: string;
  planId: PremiumPlanId;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  idempotencyKey?: string;
}) {
  const plan = PREMIUM_PLANS[input.planId];
  const stripe = getStripeClient();
  const metadata = {
    tjw_premium: '1',
    profileId: input.profileId,
    premiumPlan: input.planId,
  } as const;

  return stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'krw',
            unit_amount: plan.amountKrw,
            recurring: { interval: 'month' },
            product_data: {
              name: `태국에, 살자 프리미엄 · ${plan.label}`,
              description: '월 구독 — 스폰서 배너·광고 없는 미니홈 등 혜택',
            },
          },
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.profileId,
      metadata: { ...metadata },
      subscription_data: {
        metadata: { ...metadata },
      },
      customer_email: input.customerEmail?.trim() || undefined,
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  );
}

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
