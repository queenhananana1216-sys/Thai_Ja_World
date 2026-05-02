/**
 * GET /api/cron/news — Vercel Cron 전용 (수집 + 요약 한 번에)
 *
 * vercel.json 스케줄: UTC 기준 4시간마다 — 표현식은 저장소 루트 vercel.json 의 crons 항목과 동일.
 *
 * Vercel 대시보드에서 같은 이름의 CRON_SECRET 을 설정하면
 * 요청 헤더 Authorization: Bearer <CRON_SECRET> 으로 검증됩니다.
 *
 * 쿼리 (선택): itemsPerFeed=10&limit=8
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runNewsIngestPipeline } from '@/bots/orchestrator/runNewsIngestPipeline';
import { isCronAuthorized } from '@/lib/cronAuth';
import { isServiceRoleConfigured } from '@/lib/supabase/admin';
import {
  findActivePause,
  logCronEvent,
  pausedResponse,
  registerFailureAndSelfHeal,
} from '@/lib/cron/omniLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Vercel 플랜 한도 내 최대 — 기본 10~15초 초과 방지 (collect/process 장시간 허용) */
export const maxDuration = 300;

const MAX_ITEMS = 50;
const MAX_LIMIT = 30;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'MISSING_SERVICE_ROLE',
        hint: 'Vercel에 SUPABASE_SERVICE_ROLE_KEY와 NEXT_PUBLIC_SUPABASE_URL을 설정하세요. 뉴스 파이프라인은 anon 키로 쓸 수 없습니다.',
      },
      { status: 503 },
    );
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

  const pipelineId = 'cron/news';
  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({ pipelineId, event: 'news_fetch', status: 'fallback', meta: { mode: 'pause_skip' } });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  try {
    const { collect: collectRun, process: summarizeRun } = await runNewsIngestPipeline({
      collect: collectOpts,
      process: processOpts,
    });
    await logCronEvent({ pipelineId, event: 'news_fetch', status: 'success', meta: { route: '/api/cron/news' } });
    return NextResponse.json({
      status: 'ok',
      collect: collectRun,
      process: summarizeRun,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/cron/news]', message);
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'news_fetch',
      reason: message.toLowerCase().includes('timeout') ? 'news_api_timeout' : 'news_fetch_failed',
      retryCount: 1,
    });
    return NextResponse.json({ status: 'error', error: 'Internal Server Error' }, { status: 500 });
  }
}
