import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runPortalDailySparkCron } from '@/lib/portal/runPortalDailySparkCron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }
  const r = await runPortalDailySparkCron();
  if (!r.ok) {
    return NextResponse.json({ status: 'error', error: r.error ?? 'failed' }, { status: 500 });
  }
  return NextResponse.json({ status: 'ok', mode: r.mode });
}
