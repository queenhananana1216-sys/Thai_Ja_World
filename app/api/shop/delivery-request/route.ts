import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DeliveryRequestBody = {
  spotId?: string;
  requesterName?: string;
  requesterPhone?: string;
  deliveryAddress?: string;
  orderSummary?: string;
  desiredAt?: string;
};

function clampText(v: unknown, maxLen: number): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.slice(0, maxLen);
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: DeliveryRequestBody = {};
  try {
    body = (await req.json()) as DeliveryRequestBody;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const spotId = clampText(body.spotId, 64);
  const requesterName = clampText(body.requesterName, 80);
  const requesterPhone = clampText(body.requesterPhone, 40);
  const deliveryAddress = clampText(body.deliveryAddress, 400);
  const orderSummary = clampText(body.orderSummary, 2000);
  const desiredAt = clampText(body.desiredAt, 80);
  const desiredAtMs = Date.parse(desiredAt);

  if (!spotId || requesterName.length < 2 || requesterPhone.length < 6 || deliveryAddress.length < 5 || orderSummary.length < 2) {
    return NextResponse.json({ error: '입력값을 다시 확인해 주세요.' }, { status: 400 });
  }
  if (!Number.isFinite(desiredAtMs)) {
    return NextResponse.json({ error: '희망 배달 시간을 확인해 주세요.' }, { status: 400 });
  }
  if (desiredAtMs < Date.now() + 5 * 60_000 || desiredAtMs > Date.now() + 14 * 24 * 60 * 60_000) {
    return NextResponse.json({ error: '희망 배달 시간 범위를 벗어났습니다.' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: spot, error: spotErr } = await admin
    .from('local_spots')
    .select('id,is_published,minihome_extra')
    .eq('id', spotId)
    .maybeSingle();
  if (spotErr || !spot || !spot.is_published) {
    return NextResponse.json({ error: '가게 정보를 찾을 수 없습니다.' }, { status: 404 });
  }
  const extra =
    spot.minihome_extra && typeof spot.minihome_extra === 'object' && !Array.isArray(spot.minihome_extra)
      ? (spot.minihome_extra as Record<string, unknown>)
      : {};
  if (extra.delivery_enabled !== true) {
    return NextResponse.json({ error: '현재 배달 예약을 받고 있지 않습니다.' }, { status: 400 });
  }
  const leadMinutesRaw = extra.delivery_lead_minutes;
  const leadMinutes =
    typeof leadMinutesRaw === 'number' && Number.isFinite(leadMinutesRaw)
      ? Math.max(10, Math.min(480, Math.floor(leadMinutesRaw)))
      : 45;
  if (desiredAtMs < Date.now() + leadMinutes * 60_000) {
    return NextResponse.json({ error: `최소 ${leadMinutes}분 이후 시간으로 예약해 주세요.` }, { status: 400 });
  }

  const authClient = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const { data, error } = await admin
    .from('local_shop_delivery_requests')
    .insert({
      local_spot_id: spot.id,
      requester_profile_id: user?.id ?? null,
      requester_name: requesterName,
      requester_phone: requesterPhone,
      delivery_address: deliveryAddress,
      order_summary: orderSummary,
      desired_at: new Date(desiredAtMs).toISOString(),
      status: 'requested',
    })
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message || '배달 요청 저장에 실패했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, requestId: data?.id ?? null });
}
