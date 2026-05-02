import { NextResponse } from 'next/server';
import { createStripeBillingPortalSession } from '@/lib/payments/stripe';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  localSpotId?: string;
  returnUrl?: string;
};

function resolveReturnUrl(input: string | undefined, fallback: string, baseOrigin: string): string {
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

  const customerId = typeof spot.stripe_customer_id === 'string' ? spot.stripe_customer_id.trim() : '';
  if (!customerId) {
    return NextResponse.json({ error: 'stripe_customer_not_linked' }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://127.0.0.1:3000';
  const fallbackReturn = `${base}/my-local-shop/${localSpotId}`;
  const returnUrl = resolveReturnUrl(body.returnUrl, fallbackReturn, base);

  try {
    const portal = await createStripeBillingPortalSession({
      customerId,
      returnUrl,
    });
    return NextResponse.json({
      ok: true,
      portalUrl: portal.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'billing_portal_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
