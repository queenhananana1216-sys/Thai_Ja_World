/**
 * GET /api/cron/purge-news — 7일(NEWS_RETENTION_DAYS) 지난 raw_news 일괄 삭제
 */
import { type NextRequest, NextResponse } from 'next/server';
import { purgeStaleRawNews } from '@/bots/actions/purgeStaleRawNews';
import { isCronAuthorized } from '@/lib/cronAuth';
import { findActivePause, logCronEvent, pausedResponse, registerFailureAndSelfHeal } from '@/lib/cron/omniLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const pipelineId = 'cron/purge-news';
  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({ pipelineId, event: 'purge_news', status: 'fallback', meta: { mode: 'pause_skip' } });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  const result = await purgeStaleRawNews();
  if (!result.ok) {
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'purge_news',
      reason: 'purge_news_failed',
      retryCount: 1,
    });
    return NextResponse.json(
      { status: 'error', error: result.error ?? 'purge failed' },
      { status: 500 },
    );
  }
  await logCronEvent({ pipelineId, event: 'purge_news', status: 'success', meta: { deleted_approx: result.matched ?? null } });
  return NextResponse.json({ status: 'ok', deleted_approx: result.matched ?? null });
}
