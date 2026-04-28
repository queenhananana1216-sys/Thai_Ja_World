import { type NextRequest, NextResponse } from 'next/server';
import { runUxOptimizationLoop } from '@/bots/orchestrator/runUxOptimizationLoop';
import { isCronAuthorized } from '@/lib/cronAuth';
import { findActivePause, logCronEvent, pausedResponse, registerFailureAndSelfHeal } from '@/lib/cron/omniLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const pipelineId = 'cron/ux-bot';
  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({ pipelineId, event: 'ux_optimize', status: 'fallback', meta: { mode: 'pause_skip' } });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const wm = Number(searchParams.get('windowMinutes') ?? '15');
  const windowMinutes = Number.isFinite(wm) ? Math.min(60, Math.max(5, Math.floor(wm))) : 15;
  const result = await runUxOptimizationLoop(windowMinutes);
  if (!result.ok) {
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'ux_optimize',
      reason: 'ux_optimize_failed',
      retryCount: 1,
    });
    return NextResponse.json({ status: 'error', error: result.error ?? 'ux_loop_failed' }, { status: 500 });
  }
  await logCronEvent({ pipelineId, event: 'ux_optimize', status: 'success', meta: { window_minutes: windowMinutes } });
  return NextResponse.json({ status: 'ok', ...result });
}

