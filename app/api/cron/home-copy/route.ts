import { NextRequest, NextResponse } from 'next/server';
import { runEngagementCopyPipeline } from '@/lib/siteCopy/runEngagementCopyPipeline';
import { isCronAuthorized } from '@/lib/cronAuth';
import { findActivePause, logCronEvent, pausedResponse, registerFailureAndSelfHeal } from '@/lib/cron/omniLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const pipelineId = 'cron/home-copy';
  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({ pipelineId, event: 'home_copy_refresh', status: 'fallback', meta: { mode: 'pause_skip' } });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  try {
    const result = await runEngagementCopyPipeline();
    await logCronEvent({ pipelineId, event: 'home_copy_refresh', status: 'success', meta: { updated: result.updated } });
    return NextResponse.json({
      status: 'ok',
      updated: result.updated,
      snapshot: result.snapshot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/cron/home-copy]', message);
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'home_copy_refresh',
      reason: message.toLowerCase().includes('timeout') ? 'home_copy_timeout' : 'home_copy_failed',
      retryCount: 1,
    });
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
