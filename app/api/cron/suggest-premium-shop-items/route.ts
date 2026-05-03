/**
 * GET — 미니홈 theme.accent 샘플을 집계해 프리미엄 스킨 제안 1건을 큐에 적재 (LLM 전 규칙 기반 파이프라인).
 * Bearer: CRON_SECRET — vercel.json 등록은 선택(수동 트리거·워치독에서 호출 가능).
 */
import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import type { Json } from '../../../../supabase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const HEX = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function normalizeHex(s: string): string | null {
  const t = s.trim();
  if (!HEX.test(t)) return null;
  return t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`;
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: 'MISSING_SERVICE_ROLE' }, { status: 503 });
  }

  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin.from('user_minihomes').select('owner_id, theme').limit(80);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  const accents: string[] = [];
  for (const r of rows ?? []) {
    const th = (r as { theme?: unknown }).theme;
    if (!th || typeof th !== 'object' || Array.isArray(th)) continue;
    if (Object.keys(th as object).length === 0) continue;
    const acc = (th as Record<string, unknown>).accent;
    if (typeof acc !== 'string') continue;
    const n = normalizeHex(acc);
    if (n) accents.push(n);
  }

  if (accents.length < 3) {
    return NextResponse.json({ ok: true, skipped: 'not_enough_theme_samples', n: accents.length });
  }

  const joined = accents.slice(0, 40).sort().join('|');
  const hash = createHash('sha256').update(joined).digest('hex').slice(0, 12);
  const externalRef = `minihome-theme-cluster:${hash}`;
  const pick = accents[Math.floor(accents.length / 2)] ?? accents[0]!;

  const itemKey = `ai_skin_cluster_${hash}`;
  const payload = {
    accent: pick,
    boutique: 'ai_theme_cluster',
    sample_count: accents.length,
  } satisfies Record<string, unknown>;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="none" stroke="${pick}" stroke-width="3" opacity="0.85"/></svg>`;
  const css = `/* AI-proposed accent ring — owner approve to merge into payload */\n.minihome-boutique-ring { box-shadow: 0 0 0 2px ${pick}33 inset; border-radius: 12px; }`;

  const { error: insErr } = await admin.from('salja_shop_item_proposals').insert({
    item_key: itemKey,
    category: 'room_skin',
    label_ko: `AI 제안 · 클러스터 스킨 (${hash.slice(0, 6)})`,
    label_th: `AI แนะนำ · สกินคลัสเตอร์ (${hash.slice(0, 6)})`,
    price_points: 6400,
    rental_days: null,
    rental_price: null,
    payload: payload as Json,
    sort_order: 900,
    svg_markup: svg,
    css_snippet: css,
    source: 'ai-watchdog',
    trigger_context: {
      pipeline: 'minihome_theme_cluster',
      accent_median: pick,
      samples: accents.length,
    } as Json,
    external_ref: externalRef,
    status: 'pending',
  });

  if (insErr) {
    if (insErr.code === '23505') {
      return NextResponse.json({ ok: true, deduped: true, external_ref: externalRef });
    }
    if (insErr.message.includes('does not exist') || insErr.message.includes('schema cache')) {
      return NextResponse.json({ ok: false, error: 'table_missing_run_migration_150' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item_key: itemKey, external_ref: externalRef });
}
