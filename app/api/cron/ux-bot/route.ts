import { type NextRequest, NextResponse } from 'next/server';
import { runUxOptimizationLoop } from '@/bots/orchestrator/runUxOptimizationLoop';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const wm = Number(searchParams.get('windowMinutes') ?? '15');
  const windowMinutes = Number.isFinite(wm) ? Math.min(60, Math.max(5, Math.floor(wm))) : 15;
  const result = await runUxOptimizationLoop(windowMinutes);
  if (!result.ok) {
    return NextResponse.json({ status: 'error', error: result.error ?? 'ux_loop_failed' }, { status: 500 });
  }
  return NextResponse.json({ status: 'ok', ...result });
}

