import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createB2bLocalSubscriptionCheckoutSession } from '@/lib/payments/stripe';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  localSpotId?: string;
  /** 오너 계정에 이메일이 없을 때만 관리자가 프리필(영업 현장). */
  ownerEmailOverride?: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

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

  const admin = createServiceRoleClient();
  const { data: spot, error: spotErr } = await admin
    .from('local_spots')
    .select('id, owner_profile_id, stripe_customer_id')
    .eq('id', localSpotId)
    .maybeSingle();

  if (spotErr) {
    return NextResponse.json({ error: spotErr.message }, { status: 500 });
  }
  if (!spot) {
    return NextResponse.json({ error: 'spot_not_found' }, { status: 404 });
  }

  const ownerId = spot.owner_profile_id as string | null;
  if (!ownerId) {
    return NextResponse.json({ error: 'owner_not_assigned', hint: '로컬 가게에 오너 프로필을 먼저 연결하세요.' }, { status: 400 });
  }

  const override =
    typeof body.ownerEmailOverride === 'string' ? body.ownerEmailOverride.trim().toLowerCase() : '';

  let customerEmail: string | undefined;
  if (override && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(override)) {
    customerEmail = override;
  } else {
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(ownerId);
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 502 });
    }
    const em = authUser.user?.email?.trim();
    if (!em) {
      return NextResponse.json(
        {
          error: 'owner_email_missing',
          hint: '오너 계정에 이메일이 없습니다. 화면에서 ownerEmailOverride로 입력해 주세요.',
        },
        { status: 400 },
      );
    }
    customerEmail = em;
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://127.0.0.1:3000';
  const successUrl = `${base}/my-local-shop/${localSpotId}?billing=success`;
  const cancelUrl = `${base}/my-local-shop/${localSpotId}?billing=cancel`;

  try {
    const session = await createB2bLocalSubscriptionCheckoutSession({
      priceId,
      localSpotId,
      successUrl,
      cancelUrl,
      stripeCustomerId: typeof spot.stripe_customer_id === 'string' ? spot.stripe_customer_id : null,
      customerEmail,
      idempotencyKey: `b2b-sales-${localSpotId}-${Date.now()}`,
    });
    return NextResponse.json({
      ok: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      customerEmailUsed: customerEmail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'stripe_checkout_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
