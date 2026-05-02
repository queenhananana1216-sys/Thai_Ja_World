import { NextResponse } from 'next/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { dateKeyBangkok, parsePriceToThb } from '@/lib/local/parseMenuPriceThb';

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
  const visitAtRaw = typeof body.visit_at === 'string' ? body.visit_at.trim() : '';
  const partySizeRaw = Number(body.party_size);
  const notesRaw = typeof body.notes === 'string' ? body.notes.trim().slice(0, 3000) : '';
  const linesRaw = body.items;

  if (!localSpotId || !visitAtRaw) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  if (!Number.isFinite(partySizeRaw) || partySizeRaw < 1 || partySizeRaw > 99) {
    return NextResponse.json({ error: 'invalid_party_size' }, { status: 400 });
  }

  if (!Array.isArray(linesRaw) || linesRaw.length === 0 || !linesRaw.every(isOrderLine)) {
    return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
  }

  const visitAt = new Date(visitAtRaw);
  if (Number.isNaN(visitAt.getTime())) {
    return NextResponse.json({ error: 'invalid_visit_at' }, { status: 400 });
  }

  const now = new Date();
  if (dateKeyBangkok(visitAt) !== dateKeyBangkok(now)) {
    return NextResponse.json({ error: 'visit_must_be_today_bangkok' }, { status: 400 });
  }

  if (visitAt.getTime() < now.getTime() - 120_000) {
    return NextResponse.json({ error: 'visit_in_past' }, { status: 400 });
  }

  const sb = await createServerSupabaseAuthClient();
  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  const { data: spot, error: spotErr } = await sb
    .from('local_spots')
    .select('id, is_published')
    .eq('id', localSpotId)
    .maybeSingle();

  if (spotErr || !spot || !spot.is_published) {
    return NextResponse.json({ error: 'spot_not_available' }, { status: 404 });
  }

  const menuIds = [...new Set(linesRaw.map((l) => l.menu_id))];
  const { data: menus, error: menuErr } = await sb
    .from('local_menus')
    .select('id, name, price_thb')
    .eq('local_spot_id', localSpotId)
    .in('id', menuIds);

  if (menuErr || !menus || menus.length !== menuIds.length) {
    return NextResponse.json({ error: 'invalid_menu_selection' }, { status: 400 });
  }

  const priceById = new Map(menus.map((m) => [String((m as { id: string }).id), m as { id: string; name: string; price_thb: number | string }]));

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

  const metaNotes = [
    notesRaw,
    `[당일예약] visit_at=${visitAt.toISOString()} party=${partySizeRaw}`,
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000);

  const { data: inserted, error: insErr } = await sb
    .from('local_orders')
    .insert({
      local_spot_id: localSpotId,
      customer_profile_id: user.id,
      status: 'pending_payment',
      currency: 'THB',
      items,
      subtotal_thb: total,
      total_thb: total,
      notes: metaNotes,
      visit_at: visitAt.toISOString(),
      party_size: partySizeRaw,
    })
    .select('id, created_at')
    .maybeSingle();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, order: inserted });
}
