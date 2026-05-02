import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { sendLineNotifyMessage } from '@/lib/orders/lineNotify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ItemRow = {
  name?: string;
  qty?: number;
};

function formatItemsKo(items: unknown): string {
  if (!Array.isArray(items)) return '';
  const parts: string[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const o = raw as ItemRow;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    const qty = typeof o.qty === 'number' && Number.isFinite(o.qty) ? Math.floor(o.qty) : 0;
    if (name && qty > 0) parts.push(`${name} ${qty}개`);
  }
  return parts.join(', ');
}

function tableNoFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/table_no=([^\s\]]+)/);
  return m?.[1]?.trim() || null;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: { local_order_id?: string };
  try {
    body = (await req.json()) as { local_order_id?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const orderId = typeof body.local_order_id === 'string' ? body.local_order_id.trim() : '';
  if (!orderId) {
    return NextResponse.json({ error: 'local_order_id_required' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: order, error: orderErr } = await admin
    .from('local_orders')
    .select('id, items, notes, total_thb, created_at, local_spot_id')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  }

  const created = order.created_at ? new Date(order.created_at).getTime() : 0;
  if (!created || Date.now() - created > 10 * 60_000) {
    return NextResponse.json({ error: 'notify_window_expired' }, { status: 410 });
  }

  const { data: spot, error: spotErr } = await admin
    .from('local_spots')
    .select('id, name, minihome_extra')
    .eq('id', order.local_spot_id as string)
    .maybeSingle();

  if (spotErr || !spot) {
    return NextResponse.json({ error: 'spot_not_found' }, { status: 404 });
  }

  const extra =
    spot.minihome_extra && typeof spot.minihome_extra === 'object' && !Array.isArray(spot.minihome_extra)
      ? (spot.minihome_extra as Record<string, unknown>)
      : {};

  const lineToken =
    typeof extra.line_notify_token === 'string' ? extra.line_notify_token.trim() : process.env.LINE_NOTIFY_DEFAULT_TOKEN?.trim() ?? '';

  const tableNo = tableNoFromNotes(typeof order.notes === 'string' ? order.notes : null) ?? '?';
  const itemSummary = formatItemsKo(order.items);
  const total = order.total_thb != null ? Number(order.total_thb) : 0;
  const spotName = typeof spot.name === 'string' ? spot.name : '매장';

  const headline = `🚨 [${tableNo}번 테이블] 새로운 주문이 들어왔습니다!`;
  const detail =
    itemSummary.length > 0
      ? `${headline} (${itemSummary})`
      : `${headline} (품목 요약 없음)`;
  const message = [detail, total > 0 ? `총액 ${total.toFixed(0)} THB · ${spotName}` : spotName, `ID ${orderId.slice(0, 8)}`]
    .filter(Boolean)
    .join('\n');

  if (!lineToken) {
    return NextResponse.json({ ok: true, skipped: 'no_line_notify_token' });
  }

  const sent = await sendLineNotifyMessage(lineToken, message);
  if (!sent.ok) {
    return NextResponse.json(
      { error: 'line_notify_failed', detail: { status: sent.status, body: sent.body } },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, line: true });
}
