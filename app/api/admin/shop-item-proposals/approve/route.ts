/**
 * POST — 오너가 프리미엄 상점 아이템 제안을 승인하면 style_shop_items에 즉시 반영
 */
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { Json } from '../../../../../supabase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { proposalId?: string };
  try {
    body = (await request.json()) as { proposalId?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const proposalId = typeof body.proposalId === 'string' ? body.proposalId.trim() : '';
  if (!proposalId) {
    return NextResponse.json({ error: 'proposalId_required' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: p, error: pErr } = await admin
    .from('salja_shop_item_proposals')
    .select(
      'id,status,item_key,category,label_ko,label_th,price_points,rental_days,rental_price,payload,sort_order,svg_markup,css_snippet',
    )
    .eq('id', proposalId)
    .maybeSingle();

  if (pErr || !p) {
    return NextResponse.json({ error: pErr?.message ?? 'proposal_not_found' }, { status: 404 });
  }

  if (String(p.status) !== 'pending') {
    return NextResponse.json({ error: 'proposal_not_pending' }, { status: 400 });
  }

  const basePayload =
    p.payload && typeof p.payload === 'object' && !Array.isArray(p.payload) ? { ...(p.payload as Record<string, unknown>) } : {};
  if (typeof p.svg_markup === 'string' && p.svg_markup.trim()) {
    basePayload.proposal_svg = p.svg_markup.trim();
  }
  if (typeof p.css_snippet === 'string' && p.css_snippet.trim()) {
    basePayload.proposal_css = p.css_snippet.trim();
  }

  const itemRow = {
    item_key: String(p.item_key),
    category: String(p.category),
    price_points: Number(p.price_points),
    rental_days: p.rental_days == null ? null : Number(p.rental_days),
    rental_price: p.rental_price == null ? null : Number(p.rental_price),
    label_ko: String(p.label_ko),
    label_th: String(p.label_th),
    payload: basePayload as Json,
    sort_order: typeof p.sort_order === 'number' ? p.sort_order : 500,
    active: true,
    tier: 'premium' as const,
    min_days_since_join: 0,
    min_activity_grade: 1,
    source_type: 'platform' as const,
    sponsor_name: null,
    sponsor_region: null,
    preview_url: null,
  };

  const { error: upsertErr } = await admin.from('style_shop_items').upsert(itemRow, { onConflict: 'item_key' });
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { error: uErr } = await admin
    .from('salja_shop_item_proposals')
    .update({ status: 'accepted', updated_at: now })
    .eq('id', proposalId);

  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  revalidatePath('/shop', 'layout');
  revalidatePath('/minihome/shop', 'layout');
  return NextResponse.json({ ok: true, item_key: itemRow.item_key });
}
