import { type NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runBizRadarCron } from '@/lib/korean-biz/runBizRadarCron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Vercel Cron: daily 18:00 UTC (`vercel.json`) ≈ 한국 시간 새벽 3시경.
 * Discovery(신규 검색) + 전 행 Place Details 재검증: 주소·전화·영업 여부 반영,
 * 동일하면 last_verified_at 만 스탬프. Authorization: Bearer CRON_SECRET.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runBizRadarCron();
    return NextResponse.json({ status: 'ok', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/cron/biz-radar]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
