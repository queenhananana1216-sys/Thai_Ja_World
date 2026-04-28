import { type NextRequest, NextResponse } from 'next/server';
import { runUxOptimizationLoop } from '@/bots/orchestrator/runUxOptimizationLoop';
import { isCronAuthorized } from '@/lib/cronAuth';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { findActivePause, logCronEvent, pausedResponse, registerFailureAndSelfHeal } from '@/lib/cron/omniLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const pipelineId = 'cron/ops-monitor';
  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({ pipelineId, event: 'ops_monitor', status: 'fallback', meta: { mode: 'pause_skip' } });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  try {
    const uxResult = await runUxOptimizationLoop(15);
    const admin = createServiceRoleClient();
    const { data: alertData, error: alertError } = await admin.rpc('ops_generate_autonomous_alerts');
    if (alertError) throw new Error(alertError.message);

    await logCronEvent({ pipelineId, event: 'ops_monitor', status: uxResult.ok ? 'success' : 'delayed' });
    return NextResponse.json({
      status: uxResult.ok ? 'ok' : 'degraded',
      ux: uxResult,
      alerts: alertData ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/cron/ops-monitor]', message);
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'ops_monitor',
      reason: message.toLowerCase().includes('timeout') ? 'ops_monitor_timeout' : 'ops_monitor_failed',
      retryCount: 1,
    });
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
