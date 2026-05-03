/**
 * POST /api/internal/shop-item-proposals
 * ai-watchdog 등이 Bearer 시크릿으로 프리미엄 상점 아이템 초안을 적재합니다.
 * (SANDBOX와 동일 시크릿을 쓸 수 있음: WATCHDOG_SANDBOX_INGEST_SECRET)
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { Json } from '../../../../supabase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ingestSecret(): string | null {
  return (
    process.env.SHOP_ITEM_PROPOSAL_INGEST_SECRET?.trim() ||
    process.env.WATCHDOG_SANDBOX_INGEST_SECRET?.trim() ||
    process.env.SANDBOX_PROPOSAL_INGEST_SECRET?.trim() ||
    null
  );
}

type Body = {
  item_key?: string;
  category?: string;
  label_ko?: string;
  label_th?: string;
  price_points?: number;
  rental_days?: number | null;
  rental_price?: number | null;
  payload?: Record<string, unknown>;
  sort_order?: number;
  svg_markup?: string;
  css_snippet?: string;
  source?: string;
  trigger_context?: Record<string, unknown>;
  external_ref?: string;
};

export async function POST(request: Request) {
  const secret = ingestSecret();
  if (!secret) {
    return NextResponse.json({ error: 'ingest_secret_not_configured' }, { status: 503 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const itemKey = typeof body.item_key === 'string' ? body.item_key.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const labelKo = typeof body.label_ko === 'string' ? body.label_ko.trim() : '';
  const labelTh = typeof body.label_th === 'string' ? body.label_th.trim() : '';
  const pricePoints = typeof body.price_points === 'number' && Number.isFinite(body.price_points) ? body.price_points : 0;

  if (!itemKey || !category || !labelKo || !labelTh || pricePoints <= 0) {
    return NextResponse.json({ error: 'item_key_category_labels_price_required' }, { status: 400 });
  }

  if (!['room_skin', 'minimi', 'bgm'].includes(category)) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
  }

  const rentalDays =
    body.rental_days === null || body.rental_days === undefined
      ? null
      : typeof body.rental_days === 'number'
        ? body.rental_days
        : null;
  if (rentalDays !== null && (rentalDays < 90 || !Number.isFinite(rentalDays))) {
    return NextResponse.json({ error: 'rental_must_be_null_or_gte_90' }, { status: 400 });
  }

  const rentalPrice =
    body.rental_price === null || body.rental_price === undefined
      ? null
      : typeof body.rental_price === 'number' && Number.isFinite(body.rental_price)
        ? body.rental_price
        : null;

  const payload =
    body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? body.payload : {};

  const row = {
    item_key: itemKey,
    category,
    label_ko: labelKo,
    label_th: labelTh,
    price_points: pricePoints,
    rental_days: rentalDays,
    rental_price: rentalPrice,
    payload: payload as Json,
    sort_order: typeof body.sort_order === 'number' && Number.isFinite(body.sort_order) ? Math.floor(body.sort_order) : 500,
    svg_markup: typeof body.svg_markup === 'string' ? body.svg_markup : null,
    css_snippet: typeof body.css_snippet === 'string' ? body.css_snippet : null,
    source: typeof body.source === 'string' && body.source.trim() ? body.source.trim() : 'ai-watchdog',
    trigger_context:
      body.trigger_context && typeof body.trigger_context === 'object' && !Array.isArray(body.trigger_context)
        ? (body.trigger_context as Json)
        : {},
    external_ref: typeof body.external_ref === 'string' && body.external_ref.trim() ? body.external_ref.trim() : null,
    status: 'pending' as const,
  };

  const admin = createServiceRoleClient();
  const { data, error } = await admin.from('salja_shop_item_proposals').insert(row).select('id').single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, deduped: true, reason: 'external_ref_or_unique' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
