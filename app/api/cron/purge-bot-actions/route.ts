/**
 * GET /api/cron/purge-bot-actions — BOT_ACTIONS_RETENTION_DAYS(기본 7)보다 오래된 bot_actions 삭제
 */
import { type NextRequest, NextResponse } from 'next/server';
import { purgeStaleBotActions } from '@/bots/actions/purgeStaleBotActions';
import { isCronAuthorized } from '@/lib/cronAuth';
import { findActivePause, logCronEvent, pausedResponse, registerFailureAndSelfHeal } from '@/lib/cron/omniLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const pipelineId = 'cron/purge-bot-actions';
  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({ pipelineId, event: 'purge_bot_actions', status: 'fallback', meta: { mode: 'pause_skip' } });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  const result = await purgeStaleBotActions();
  if (!result.ok) {
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'purge_bot_actions',
      reason: 'purge_bot_actions_failed',
      retryCount: 1,
    });
    return NextResponse.json(
      { status: 'error', error: result.error ?? 'purge failed' },
      { status: 500 },
    );
  }
  await logCronEvent({
    pipelineId,
    event: 'purge_bot_actions',
    status: 'success',
    meta: { deleted_approx: result.matched ?? null },
  });
  return NextResponse.json({ status: 'ok', deleted_approx: result.matched ?? null });
}
