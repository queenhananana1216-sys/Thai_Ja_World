/**
 * POST /api/bot/seo-retrofit-indexing
 * 레트로핏·대량 메타 갱신 후 발행 URL을 Google Indexing API로 순차 통지(일일 쿼터 상한 내).
 * Authorization: Bearer CRON_SECRET
 */
import { type NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runRetrofitIndexingSweep } from '@/lib/seo/retrofitIndexingSweep';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ status: 'error', error: 'service_role_required' }, { status: 503 });
  }

  let raw: Record<string, unknown> = {};
  try {
    const t = await req.text();
    if (t.trim()) raw = JSON.parse(t) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ status: 'error', error: 'Invalid JSON body' }, { status: 400 });
  }

  const num = (k: string, d: number, max: number) => {
    const v = raw[k];
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseInt(v, 10) : d;
    return Math.min(max, Math.max(1, Number.isFinite(n) ? Math.floor(n) : d));
  };

  const newsLimit = num('newsLimit', 600, 1200);
  const postsLimit = num('postsLimit', 800, 2000);
  const maxPublishTotal = num('maxPublishTotal', 160, 190);

  try {
    const admin = createServiceRoleClient();
    const out = await runRetrofitIndexingSweep(admin, {
      newsLimit,
      postsLimit,
      maxPublishTotal,
    });
    return NextResponse.json({ status: 'ok', ...out });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
