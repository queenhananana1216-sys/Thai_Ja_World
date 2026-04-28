import { type NextRequest, NextResponse } from 'next/server';
import { runUxOptimizationLoop } from '@/bots/orchestrator/runUxOptimizationLoop';
import { isCronAuthorized } from '@/lib/cronAuth';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const uxResult = await runUxOptimizationLoop(15);
    const admin = createServiceRoleClient();
    const { data: alertData, error: alertError } = await admin.rpc('ops_generate_autonomous_alerts');
    if (alertError) throw new Error(alertError.message);

    return NextResponse.json({
      status: uxResult.ok ? 'ok' : 'degraded',
      ux: uxResult,
      alerts: alertData ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/cron/ops-monitor]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
