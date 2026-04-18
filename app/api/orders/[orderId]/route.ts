import { NextResponse } from 'next/server';
import { featureFlags } from '@/lib/flags';
import { isOrderStatus } from '@/lib/orders/constants';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

type PatchOrderBody = {
  status?: string;
  note?: string;
};

function canCustomerTransition(fromStatus: string, toStatus: string): boolean {
  return fromStatus === 'pending' && toStatus === 'cancelled';
}

function canShopOwnerTransition(fromStatus: string, toStatus: string): boolean {
  if (fromStatus === 'paid' && toStatus === 'preparing') return true;
  if (fromStatus === 'preparing' && toStatus === 'out_for_delivery') return true;
  if (fromStatus === 'out_for_delivery' && toStatus === 'delivered') return true;
  if (fromStatus === 'paid' && toStatus === 'cancelled') return true;
  if (fromStatus === 'preparing' && toStatus === 'cancelled') return true;
  return false;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
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

  const { orderId } = await context.params;
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, customer_id, shop_id, status, payment_method, payment_provider, payment_ref, total_amount_thb, currency, contact_phone, delivery_address, notes, created_at, requested_delivery_at',
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? 'not_found' }, { status: 404 });
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id, item_name, quantity, unit_price_thb, line_total_thb')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const { data: events, error: eventsError } = await supabase
    .from('order_status_events')
    .select('id, status, note, actor_profile_id, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 });
  }

  return NextResponse.json({ order, items: items ?? [], events: events ?? [] });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
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

  let body: PatchOrderBody;
  try {
    body = (await request.json()) as PatchOrderBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const status = typeof body.status === 'string' ? body.status : '';
  if (!isOrderStatus(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  const { orderId } = await context.params;
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from('orders')
    .select('id, customer_id, shop_id, status')
    .eq('id', orderId)
    .single();
  if (existingOrderError || !existingOrder) {
    return NextResponse.json({ error: existingOrderError?.message ?? 'order_not_found' }, { status: 404 });
  }

  const isCustomer = existingOrder.customer_id === user.id;
  const { data: ownedShop, error: ownedShopError } = await supabase
    .from('local_spots')
    .select('id')
    .eq('id', existingOrder.shop_id)
    .eq('owner_profile_id', user.id)
    .maybeSingle();
  if (ownedShopError) {
    return NextResponse.json({ error: ownedShopError.message }, { status: 500 });
  }
  const isShopOwner = Boolean(ownedShop?.id);

  const currentStatus = existingOrder.status;
  const canTransition = isCustomer
    ? canCustomerTransition(currentStatus, status)
    : isShopOwner
      ? canShopOwnerTransition(currentStatus, status)
      : false;
  if (!canTransition) {
    return NextResponse.json(
      { error: 'invalid_status_transition', from: currentStatus, to: status },
      { status: 403 },
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('id, status')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? 'order_update_failed' }, { status: 500 });
  }

  const { error: eventError } = await supabase.from('order_status_events').insert({
    order_id: orderId,
    status,
    actor_profile_id: user.id,
    note: typeof body.note === 'string' ? body.note.slice(0, 500) : 'status_updated',
  });
  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, order: updated });
}
