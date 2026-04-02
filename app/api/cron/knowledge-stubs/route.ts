/**
 * GET /api/cron/knowledge-stubs — Vercel Cron: 스텁(LLM 미가공) 지식 초안만 순차 재가공
 *
 * 일반 knowledge-process 는 «processed 없는 raw»만 처리해, 이미 스텁 행이 있으면 영원히 건너뜁니다.
 * 이 엔드포인트가 그 구멍을 메웁니다.
 *
 * 쿼리: limit=1~12 (기본 6, 또는 KNOWLEDGE_STUB_REPAIR_BATCH_SIZE)
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runKnowledgeStubRepairLoop } from '@/bots/orchestrator/runKnowledgeStubRepairLoop';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const lim = req.nextUrl.searchParams.get('limit');
  let limit: number | undefined;
  if (lim != null && lim !== '') {
    const n = Math.floor(Number(lim));
    if (!Number.isFinite(n) || n < 1 || n > 12) {
      return NextResponse.json({ status: 'error', error: 'limit must be 1–12' }, { status: 400 });
    }
    limit = n;
  }

  try {
    const result = await runKnowledgeStubRepairLoop({ limit });
    if (!result.success) {
      const status = result.error?.includes('LLM not configured') ? 503 : 500;
      return NextResponse.json({ status: 'error', ...result }, { status });
    }
    return NextResponse.json({ status: 'ok', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/cron/knowledge-stubs]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
