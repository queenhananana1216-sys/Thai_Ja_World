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
