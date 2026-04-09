/**
 * GET /api/bot/pipeline-health
 *
 * 봇 파이프라인 전체 헬스 리포트를 반환합니다.
 * bot_actions 테이블의 최근 72h 기록을 기반으로 각 컴포넌트의
 * 실행 상태(healthy / degraded / down / unknown)를 판단합니다.
 *
 * 보안: CRON_SECRET 또는 BOT_CRON_SECRET 이 설정되면
 *       Authorization: Bearer <동일값> 헤더가 필요합니다.
 *
 * 응답 예시:
 * {
 *   "status": "ok",
 *   "checked_at": "2026-04-09T...",
 *   "overall": "healthy",
 *   "components": [
 *     {
 *       "bot_name": "news_curator",
 *       "label": "뉴스 수집 (RSS → raw_news)",
 *       "status": "healthy",
 *       "summary": { "success_24h": 2, "failed_24h": 0, ... }
 *     },
 *     ...
 *   ]
 * }
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getPipelineHealthReport } from '@/bots/adapters/pipelineHealthQuery';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 헬스 체크는 빠르게 응답해야 하므로 짧은 maxDuration 유지
export const maxDuration = 30;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await getPipelineHealthReport();
    const httpStatus = report.overall === 'down' ? 503 : 200;

    return NextResponse.json(
      {
        status: 'ok',
        checked_at: report.checked_at,
        overall: report.overall,
        components: report.components,
      },
      { status: httpStatus },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/pipeline-health]', message);
    return NextResponse.json(
      { status: 'error', error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
