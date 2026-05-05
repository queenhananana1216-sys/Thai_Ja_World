/**
 * 한인 생활망 2주 감사 — Places Details 대조 후 불일치는 `biz_update_proposals`에만 적재 (휴먼 승인 전 DB 원본 불변).
 * Vercel Cron: 매월 1일·15일 UTC (`vercel.json`). Authorization: Bearer CRON_SECRET
 */
import { type NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runBizRadarAuditCron } from '@/lib/korean-biz/runBizRadarAuditCron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runBizRadarAuditCron();
    return NextResponse.json({ status: 'ok', ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[biz-radar-audit]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
