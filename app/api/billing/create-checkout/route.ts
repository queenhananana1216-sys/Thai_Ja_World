import { NextResponse } from 'next/server';
import { createB2bLocalSubscriptionCheckoutSession } from '@/lib/payments/stripe';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  localSpotId?: string;
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
  const priceId = process.env.STRIPE_B2B_SUBSCRIPTION_PRICE_ID?.trim();
  if (!priceId) {
    return NextResponse.json({ error: 'STRIPE_B2B_SUBSCRIPTION_PRICE_ID missing' }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const localSpotId = typeof body.localSpotId === 'string' ? body.localSpotId.trim() : '';
  if (!localSpotId) {
    return NextResponse.json({ error: 'localSpotId_required' }, { status: 400 });
  }

  const sb = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: spot, error: spotErr } = await sb
    .from('local_spots')
    .select('id, owner_profile_id, stripe_customer_id')
    .eq('id', localSpotId)
    .maybeSingle();

  if (spotErr) {
    return NextResponse.json({ error: spotErr.message }, { status: 500 });
  }
  if (!spot || spot.owner_profile_id !== user.id) {
    return NextResponse.json({ error: 'forbidden_or_not_found' }, { status: 403 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://127.0.0.1:3000';
  const successFallback = `${base}/my-local-shop/${localSpotId}?billing=success`;
  const cancelFallback = `${base}/my-local-shop/${localSpotId}?billing=cancel`;
  const successUrl = resolveCheckoutUrl(body.successUrl, successFallback, base);
  const cancelUrl = resolveCheckoutUrl(body.cancelUrl, cancelFallback, base);

  try {
    const session = await createB2bLocalSubscriptionCheckoutSession({
      priceId,
      localSpotId,
      successUrl,
      cancelUrl,
      stripeCustomerId: spot.stripe_customer_id,
      customerEmail: user.email ?? undefined,
      idempotencyKey: `b2b-sub-checkout-${localSpotId}`,
    });
    return NextResponse.json({
      ok: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'stripe_checkout_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
