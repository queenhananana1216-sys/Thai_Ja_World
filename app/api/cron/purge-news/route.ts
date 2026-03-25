/**
 * GET /api/cron/purge-news — 7일(NEWS_RETENTION_DAYS) 지난 raw_news 일괄 삭제
 */
import { type NextRequest, NextResponse } from 'next/server';
import { purgeStaleRawNews } from '@/bots/actions/purgeStaleRawNews';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const result = await purgeStaleRawNews();
  if (!result.ok) {
    return NextResponse.json(
      { status: 'error', error: result.error ?? 'purge failed' },
      { status: 500 },
    );
  }
  return NextResponse.json({ status: 'ok', deleted_approx: result.matched ?? null });
}
