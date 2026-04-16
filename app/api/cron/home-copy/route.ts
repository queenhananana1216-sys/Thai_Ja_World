import { NextRequest, NextResponse } from 'next/server';
import { runEngagementCopyPipeline } from '@/lib/siteCopy/runEngagementCopyPipeline';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runEngagementCopyPipeline();
    return NextResponse.json({
      status: 'ok',
      updated: result.updated,
      snapshot: result.snapshot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/cron/home-copy]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
