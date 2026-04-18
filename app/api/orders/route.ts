import { NextResponse } from 'next/server';
import { featureFlags } from '@/lib/flags';
import { isPaymentMethod } from '@/lib/orders/constants';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

type CreateOrderBody = {
  shopId?: string;
  deliverySlotId?: string | null;
  paymentMethod?: string;
  contactPhone?: string;
  deliveryAddress?: string;
  notes?: string;
  requestedDeliveryAt?: string | null;
  items?: Array<{ name?: string; quantity?: number; unitPriceThb?: number }>;
};

function asNum(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return value;
}

export async function GET() {
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

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, status, payment_method, total_amount_thb, currency, created_at, requested_delivery_at, shop_id',
    )
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ orders: data ?? [] });
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

  let body: CreateOrderBody;
  try {
    body = (await request.json()) as CreateOrderBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const shopId = typeof body.shopId === 'string' ? body.shopId.trim() : '';
  if (!shopId) {
    return NextResponse.json({ error: 'shopId_required' }, { status: 400 });
  }
  const paymentMethodRaw = typeof body.paymentMethod === 'string' ? body.paymentMethod : 'card';
  if (!isPaymentMethod(paymentMethodRaw)) {
    return NextResponse.json({ error: 'invalid_payment_method' }, { status: 400 });
  }

  const rows = Array.isArray(body.items) ? body.items : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: 'items_required' }, { status: 400 });
  }

  const normalizedItems = rows
    .map((item) => ({
      item_name: typeof item.name === 'string' ? item.name.trim() : '',
      quantity: Math.max(1, Math.floor(asNum(item.quantity))),
      unit_price_thb: Number(asNum(item.unitPriceThb).toFixed(2)),
    }))
    .filter((item) => item.item_name.length > 0);

  if (normalizedItems.length === 0) {
    return NextResponse.json({ error: 'valid_items_required' }, { status: 400 });
  }

  const total = Number(
    normalizedItems
      .reduce((sum, item) => sum + item.quantity * item.unit_price_thb, 0)
      .toFixed(2),
  );

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      shop_id: shopId,
      delivery_slot_id: body.deliverySlotId ?? null,
      status: 'pending',
      payment_method: paymentMethodRaw,
      payment_provider: null,
      payment_ref: null,
      total_amount_thb: total,
      currency: 'THB',
      contact_phone: typeof body.contactPhone === 'string' ? body.contactPhone.trim() : null,
      delivery_address: typeof body.deliveryAddress === 'string' ? body.deliveryAddress.trim() : null,
      notes: typeof body.notes === 'string' ? body.notes.trim() : null,
      requested_delivery_at:
        typeof body.requestedDeliveryAt === 'string' ? body.requestedDeliveryAt : null,
    })
    .select('id')
    .single();

  if (orderError || !orderRow) {
    return NextResponse.json({ error: orderError?.message ?? 'order_create_failed' }, { status: 500 });
  }

  const itemInsert = normalizedItems.map((item) => ({
    order_id: orderRow.id,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price_thb: item.unit_price_thb,
    line_total_thb: Number((item.quantity * item.unit_price_thb).toFixed(2)),
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(itemInsert);
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const { error: eventError } = await supabase.from('order_status_events').insert({
    order_id: orderRow.id,
    status: 'pending',
    actor_profile_id: user.id,
    note: 'order_created',
  });
  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orderId: orderRow.id, totalAmountThb: total });
}
