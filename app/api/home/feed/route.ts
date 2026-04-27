import { NextResponse } from 'next/server';
import { fetchHomeUnifiedFeed } from '../../../_components/home/home-queries';

export const runtime = 'nodejs';

function parseBefore(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseBeforeId(raw: string | null): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return null;
  return v;
}

/**
 * 홈 하단 무한 스크롤 — posts + jobs + market 통합 (`get_home_unified_feed` RPC)
 * ?before=ISO&before_id=uuid — 키셋; 둘 다 있어야 다음 페이지.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const before = parseBefore(url.searchParams.get('before'));
  const beforeId = parseBeforeId(url.searchParams.get('before_id'));
  const limitRaw = Number(url.searchParams.get('limit') ?? '14');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(40, Math.floor(limitRaw))) : 14;

  const hasCursor = Boolean(before && beforeId);
  const { rows, error } = await fetchHomeUnifiedFeed(
    limit,
    hasCursor ? { createdAt: before!, id: beforeId! } : null,
  );

  if (error) {
    return NextResponse.json({ ok: false as const, error, items: [] as const }, { status: 200 });
  }

  return NextResponse.json({ ok: true as const, error: null as null, items: rows });
}
