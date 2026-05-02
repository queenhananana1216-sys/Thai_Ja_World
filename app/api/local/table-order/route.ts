import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { parsePriceToThb } from '@/lib/local/parseMenuPriceThb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OrderLine = { menu_id: string; qty: number };

function isOrderLine(v: unknown): v is OrderLine {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return typeof o.menu_id === 'string' && typeof o.qty === 'number';
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const localSpotId = typeof body.local_spot_id === 'string' ? body.local_spot_id.trim() : '';
  const tableNoRaw = typeof body.table_no === 'string' ? body.table_no.trim() : '';
  const paymentRaw = typeof body.payment_method === 'string' ? body.payment_method.trim().toLowerCase() : '';
  const notesRaw = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : '';
  const linesRaw = body.items;

  const payment_method = paymentRaw === 'promptpay' ? 'promptpay' : 'counter';

  if (!localSpotId || !tableNoRaw || tableNoRaw.length > 20) {
    return NextResponse.json({ error: 'missing_or_invalid_table' }, { status: 400 });
  }

  if (!Array.isArray(linesRaw) || linesRaw.length === 0 || !linesRaw.every(isOrderLine)) {
    return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: spot, error: spotErr } = await admin
    .from('local_spots')
    .select('id, is_published')
    .eq('id', localSpotId)
    .maybeSingle();

  if (spotErr || !spot || !spot.is_published) {
    return NextResponse.json({ error: 'spot_not_available' }, { status: 404 });
  }

  const authSb = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await authSb.auth.getUser();

  const menuIds = [...new Set(linesRaw.map((l) => l.menu_id))];
  const { data: menus, error: menuErr } = await admin
    .from('local_menus')
    .select('id, name, price_thb, is_sold_out')
    .eq('local_spot_id', localSpotId)
    .in('id', menuIds);

  if (menuErr || !menus || menus.length !== menuIds.length) {
    return NextResponse.json({ error: 'invalid_menu_selection' }, { status: 400 });
  }

  const sold = menus.filter((m) => (m as { is_sold_out?: boolean }).is_sold_out);
  if (sold.length > 0) {
    return NextResponse.json({ error: 'includes_sold_out_item' }, { status: 400 });
  }

  const priceById = new Map(
    menus.map((m) => [String((m as { id: string }).id), m as { id: string; name: string; price_thb: number | string }]),
  );

  const items: Array<Record<string, unknown>> = [];
  let subtotal = 0;

  for (const line of linesRaw) {
    const qty = Math.floor(line.qty);
    if (qty < 1 || qty > 99) {
      return NextResponse.json({ error: 'invalid_qty' }, { status: 400 });
    }
    const row = priceById.get(line.menu_id);
    if (!row) return NextResponse.json({ error: 'invalid_menu_selection' }, { status: 400 });
    const unit = parsePriceToThb(String(row.price_thb ?? '0'));
    const lineTotal = unit * qty;
    subtotal += lineTotal;
    items.push({
      menu_id: row.id,
      name: row.name,
      qty,
      unit_price_thb: unit,
      line_total_thb: Math.round(lineTotal * 100) / 100,
    });
  }

  const total = Math.round(subtotal * 100) / 100;
  const visitAt = new Date();

  const metaNotes = [
    notesRaw,
    `[테이블 QR 주문] table_no=${tableNoRaw} payment=${payment_method}`,
    `visit_at=${visitAt.toISOString()} party=1`,
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000);

  const { data: inserted, error: insErr } = await admin
    .from('local_orders')
    .insert({
      local_spot_id: localSpotId,
      customer_profile_id: user?.id ?? null,
      status: 'pending_payment',
      currency: 'THB',
      items,
      subtotal_thb: total,
      total_thb: total,
      notes: metaNotes,
      visit_at: visitAt.toISOString(),
      party_size: 1,
      payment_provider: payment_method === 'promptpay' ? 'promptpay' : null,
    })
    .select('id, created_at, total_thb')
    .maybeSingle();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    order: inserted,
    payment_method,
    table_no: tableNoRaw,
  });
}
