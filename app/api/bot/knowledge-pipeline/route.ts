/**
 * POST /api/bot/knowledge-pipeline
 *
 * 수집 + 가공을 한 번에 실행하는 편의 엔드포인트.
 * skipCollect=true 이면 가공만, skipProcess=true 이면 수집만 실행.
 *
 * Body (JSON, 모두 선택):
 * {
 *   "skipCollect": false,
 *   "skipProcess": false,
 *   "itemsPerSource": 5,
 *   "limit": 5,
 *   "idempotencyKey": "pipeline-2026-03-26"
 * }
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runKnowledgeCollectLoop } from '@/bots/orchestrator/runKnowledgeCollectLoop';
import { runKnowledgeProcessLoop } from '@/bots/orchestrator/runKnowledgeProcessLoop';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.trim().length > 0) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ status: 'error', error: 'Invalid JSON in request body.' }, { status: 400 });
  }

  const skipCollect = body.skipCollect === true;
  const skipProcess = body.skipProcess === true;
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined;

  interface RunResult {
    run_id: string;
    skipped: boolean;
    success?: boolean;
    error?: string;
    output?: Record<string, unknown>;
  }

  let collectResult: RunResult | null = null;
  let processResult: RunResult | null = null;

  if (!skipCollect) {
    const itemsPerSource = typeof body.itemsPerSource === 'number' ? Math.floor(body.itemsPerSource) : undefined;
    collectResult = await runKnowledgeCollectLoop({
      idempotencyKey: idempotencyKey ? `collect:${idempotencyKey}` : undefined,
      itemsPerSource,
    });
  }

  if (!skipProcess) {
    const limit = typeof body.limit === 'number' ? Math.floor(body.limit) : undefined;
    processResult = await runKnowledgeProcessLoop({
      idempotencyKey: idempotencyKey ? `process:${idempotencyKey}` : undefined,
      limit,
    });
  }

  return NextResponse.json({
    status: 'ok',
    collect: collectResult ? { run_id: collectResult.run_id, skipped: collectResult.skipped, success: collectResult.success, error: collectResult.error } : null,
    process: processResult ? { run_id: processResult.run_id, skipped: processResult.skipped, success: processResult.success, error: processResult.error } : null,
  });
}
