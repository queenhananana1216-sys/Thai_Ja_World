/**
 * GET /api/cron/knowledge — Vercel Cron 전용 (수집 + 가공 순차 실행)
 *
 * vercel.json 스케줄 권장:
 *   수집: "30 21 * * *" (UTC) ≈ 한국 06:30
 *   가공: "50 21 * * *" (UTC) ≈ 한국 06:50 (수집 완료 후 실행)
 *   또는 이 엔드포인트 하나로 pipeline 실행
 *
 * 쿼리 (선택): itemsPerSource=5&limit=5
 *
 * idempotencyScope (선택, 기본 day):
 *   - day   — 하루 1회만 실수집(Vercel Cron 기본과 동일)
 *   - hour  — UTC 기준 매 시각 1회(항상 켜 둔 PC에서 30~60분마다 호출용)
 *   - none  — 매 요청마다 수집·가공(부하 큼 — 간격 넉넉히)
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runKnowledgeCollectLoop } from '@/bots/orchestrator/runKnowledgeCollectLoop';
import { runKnowledgeProcessLoop } from '@/bots/orchestrator/runKnowledgeProcessLoop';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_ITEMS = 20;
const MAX_LIMIT = 30;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const collectOpts: { itemsPerSource?: number } = {};
  const processOpts: { limit?: number } = {};

  const ips = searchParams.get('itemsPerSource');
  if (ips) {
    const n = Math.floor(Number(ips));
    if (Number.isFinite(n) && n >= 1 && n <= MAX_ITEMS) collectOpts.itemsPerSource = n;
  }

  const lim = searchParams.get('limit');
  if (lim) {
    const n = Math.floor(Number(lim));
    if (Number.isFinite(n) && n >= 1 && n <= MAX_LIMIT) processOpts.limit = n;
  }

  const scopeRaw = (searchParams.get('idempotencyScope') ?? 'day').toLowerCase();
  const scope = scopeRaw === 'hour' || scopeRaw === 'none' ? scopeRaw : 'day';
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hourUtc = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH

  let collectKey: string | undefined;
  let processKey: string | undefined;
  if (scope === 'day') {
    collectKey = `cron-knowledge-collect-${day}`;
    processKey = `cron-knowledge-process-${day}`;
  } else if (scope === 'hour') {
    collectKey = `cron-knowledge-collect-${hourUtc}`;
    processKey = `cron-knowledge-process-${hourUtc}`;
  }
  // scope === 'none' → 키 없음 = 호출마다 실행

  const collectRun = await runKnowledgeCollectLoop({
    ...collectOpts,
    ...(collectKey ? { idempotencyKey: collectKey } : {}),
  });

  const processRun = await runKnowledgeProcessLoop({
    ...processOpts,
    ...(processKey ? { idempotencyKey: processKey } : {}),
  });

  return NextResponse.json({
    status: 'ok',
    collect: {
      run_id: collectRun.run_id,
      skipped: collectRun.skipped,
      success: collectRun.success,
      error: collectRun.error,
    },
    process: {
      run_id: processRun.run_id,
      skipped: processRun.skipped,
      success: processRun.success,
      error: processRun.error,
    },
  });
}
