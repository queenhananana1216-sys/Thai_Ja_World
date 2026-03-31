/**
 * GET /api/cron/knowledge — Vercel Cron 전용 (수집 + 가공 순차 실행)
 *
 * vercel.json 스케줄 권장:
 *   수집: "30 21 * * *" (UTC) ≈ 한국 06:30
 *   가공: "50 21 * * *" (UTC) ≈ 한국 06:50 (수집 완료 후 실행)
 *   또는 이 엔드포인트 하나로 pipeline 실행
 *
 * 쿼리 (선택): itemsPerSource=8&limit=30
 *
 * collectIdempotencyScope (기본 day) / processIdempotencyScope (기본 none):
 *   - day  — 해당 구간 하루 1회 스킵
 *   - hour — UTC 시각당 1회
 *   - none — 매번 실행
 * 레거시 idempotencyScope=day 는 수집·가공 둘 다에 동일 적용.
 *
 * 가공(process) 기본을 none으로 두어 같은 날 여러 번 호출해도 백로그를 계속 줄입니다.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runKnowledgeCollectLoop } from '@/bots/orchestrator/runKnowledgeCollectLoop';
import { runKnowledgeProcessLoop } from '@/bots/orchestrator/runKnowledgeProcessLoop';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_ITEMS = 20;
const MAX_LIMIT = 50;
const DEFAULT_PROCESS_LIMIT = 25;

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
  } else {
    processOpts.limit = DEFAULT_PROCESS_LIMIT;
  }

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hourUtc = now.toISOString().slice(0, 13);

  const legacyScope = searchParams.get('idempotencyScope');
  const collectScopeRaw = (searchParams.get('collectIdempotencyScope') ?? legacyScope ?? 'day').toLowerCase();
  const processExplicit = searchParams.get('processIdempotencyScope');
  const processScopeRaw =
    processExplicit !== null
      ? processExplicit.toLowerCase()
      : legacyScope !== null
        ? legacyScope.toLowerCase()
        : 'none';

  const collectScope = collectScopeRaw === 'hour' || collectScopeRaw === 'none' ? collectScopeRaw : 'day';
  const processScope = processScopeRaw === 'hour' || processScopeRaw === 'day' ? processScopeRaw : 'none';

  let collectKey: string | undefined;
  let processKey: string | undefined;
  if (collectScope === 'day') collectKey = `cron-knowledge-collect-${day}`;
  else if (collectScope === 'hour') collectKey = `cron-knowledge-collect-${hourUtc}`;

  if (processScope === 'day') processKey = `cron-knowledge-process-${day}`;
  else if (processScope === 'hour') processKey = `cron-knowledge-process-${hourUtc}`;

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
