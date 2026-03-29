/**
 * GET /api/cron/news — Vercel Cron 전용 (수집 + 요약 한 번에)
 *
 * vercel.json 스케줄: `0 3,21 * * *` (UTC) — 하루 2회(수집+요약).
 *
 * Vercel 대시보드에서 같은 이름의 CRON_SECRET 을 설정하면
 * 요청 헤더 Authorization: Bearer <CRON_SECRET> 으로 검증됩니다.
 *
 * 쿼리 (선택): itemsPerFeed=10&limit=8
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runNewsIngestPipeline } from '@/bots/orchestrator/runNewsIngestPipeline';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_ITEMS = 50;
const MAX_LIMIT = 30;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const collectOpts: { itemsPerFeed?: number } = {};
  const processOpts: { limit?: number } = {};

  const ipf = searchParams.get('itemsPerFeed');
  if (ipf) {
    const n = Math.floor(Number(ipf));
    if (Number.isFinite(n) && n >= 1 && n <= MAX_ITEMS) collectOpts.itemsPerFeed = n;
  }

  const lim = searchParams.get('limit');
  if (lim) {
    const n = Math.floor(Number(lim));
    if (Number.isFinite(n) && n >= 1 && n <= MAX_LIMIT) processOpts.limit = n;
  }

  try {
    const { collect: collectRun, process: summarizeRun } = await runNewsIngestPipeline({
      collect: collectOpts,
      process: processOpts,
    });
    return NextResponse.json({
      status: 'ok',
      collect: collectRun,
      process: summarizeRun,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/cron/news]', message);
    return NextResponse.json({ status: 'error', error: 'Internal Server Error' }, { status: 500 });
  }
}
