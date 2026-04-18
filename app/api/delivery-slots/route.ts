import { NextResponse } from 'next/server';
import { featureFlags } from '@/lib/flags';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

type CreateSlotBody = {
  shopId?: string;
  slotDate?: string;
  slotStart?: string;
  slotEnd?: string;
  maxOrders?: number;
  feeThb?: number;
};

export async function GET(request: Request) {
  if (!featureFlags.ordersDeliveryV1) {
    return NextResponse.json({ error: 'orders_delivery_feature_disabled' }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shopId')?.trim() || '';
  if (!shopId) return NextResponse.json({ error: 'shopId_required' }, { status: 400 });
  const slotDate = searchParams.get('slotDate')?.trim() || '';

  const supabase = await createServerSupabaseAuthClient();
  let query = supabase
    .from('delivery_slots')
    .select('id, shop_id, slot_date, slot_start, slot_end, max_orders, fee_thb, is_active')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .order('slot_date', { ascending: true })
    .order('slot_start', { ascending: true });
  if (slotDate) query = query.eq('slot_date', slotDate);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slots: data ?? [] });
}

export async function POST(request: Request) {
  if (!featureFlags.ordersDeliveryV1) {
    return NextResponse.json({ error: 'orders_delivery_feature_disabled' }, { status: 503 });
  }
  const supabase = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: CreateSlotBody;
  try {
    body = (await request.json()) as CreateSlotBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const shopId = typeof body.shopId === 'string' ? body.shopId.trim() : '';
  const slotDate = typeof body.slotDate === 'string' ? body.slotDate.trim() : '';
  const slotStart = typeof body.slotStart === 'string' ? body.slotStart.trim() : '';
  const slotEnd = typeof body.slotEnd === 'string' ? body.slotEnd.trim() : '';
  if (!shopId || !slotDate || !slotStart || !slotEnd) {
    return NextResponse.json({ error: 'required_fields_missing' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('delivery_slots')
    .insert({
      shop_id: shopId,
      slot_date: slotDate,
      slot_start: slotStart,
      slot_end: slotEnd,
      max_orders:
        typeof body.maxOrders === 'number' && Number.isFinite(body.maxOrders)
          ? Math.max(1, Math.floor(body.maxOrders))
          : 10,
      fee_thb:
        typeof body.feeThb === 'number' && Number.isFinite(body.feeThb)
          ? Math.max(0, Number(body.feeThb.toFixed(2)))
          : 0,
    })
    .select('id, slot_date, slot_start, slot_end, max_orders, fee_thb')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, slot: data });
}
