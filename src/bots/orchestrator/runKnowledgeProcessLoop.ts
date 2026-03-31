/**
 * runKnowledgeProcessLoop.ts — raw_knowledge → LLM 구조화 배치
 * bot_name: knowledge_curator_process / action_type: analyze
 */

import { randomUUID } from 'node:crypto';
import { isDuplicate, logFail, logSkip, logStart, logSuccess } from '../logging/botActionLogger';
import {
  processAndPersistKnowledgeBatch,
  isKnowledgeLlmConfigured,
  stubKnowledgeOnLlmFailure,
} from '../actions/processAndPersistKnowledge';

export interface RunKnowledgeProcessOptions {
  idempotencyKey?: string;
  /** 한 번에 처리할 항목 수 (1–30), env KNOWLEDGE_PROCESS_BATCH_SIZE 기본값 덮어씀 */
  limit?: number;
}

export interface RunKnowledgeProcessResult {
  run_id: string;
  skipped: boolean;
  success?: boolean;
  error?: string;
  output?: Record<string, unknown>;
}

const BOT_NAME = 'knowledge_curator_process' as const;
const ACTION_TYPE = 'analyze' as const;
const OBJECTIVE = 'raw_knowledge LLM 구조화 → processed_knowledge / knowledge_summaries 적재' as const;
const PRIORITY = 3 as const;

export async function runKnowledgeProcessLoop(
  options: RunKnowledgeProcessOptions = {},
): Promise<RunKnowledgeProcessResult> {
  const { idempotencyKey, limit: limitOpt } = options;
  const envBatch = Number(process.env.KNOWLEDGE_PROCESS_BATCH_SIZE);
  const defaultLimit = Number.isFinite(envBatch) && envBatch >= 1 ? Math.min(envBatch, 30) : 15;
  const limit = limitOpt ?? defaultLimit;
  const run_id = randomUUID();

  const inputPayload: Record<string, unknown> = { limit };
  if (idempotencyKey) inputPayload.idempotencyKey = idempotencyKey;

  console.log(`[KnowledgeProcess] 시작 run_id=${run_id} limit=${limit}`);

  if (idempotencyKey) {
    const duplicate = await isDuplicate(BOT_NAME, idempotencyKey);
    if (duplicate) {
      console.log(`[KnowledgeProcess] SKIP — 중복 key: ${idempotencyKey}`);
      return { run_id, skipped: true };
    }
  }

  const rowId = await logStart({
    run_id,
    bot_name: BOT_NAME,
    action_type: ACTION_TYPE,
    objective: OBJECTIVE,
    target_entity: 'raw_knowledge',
    priority: PRIORITY,
    input_payload: inputPayload,
  });

  if (!rowId) {
    return { run_id, skipped: false, success: false, error: 'DB logStart failed' };
  }

  if (!isKnowledgeLlmConfigured() && !stubKnowledgeOnLlmFailure()) {
    await logSkip(rowId, 'LLM 미설정 — 키/URL 없음. 스텁을 쓰려면 KNOWLEDGE_LLM_FALLBACK_STUB=1 이거나 KNOWLEDGE_PUBLISH_MODE 를 auto 가 아닌 값(또는 미설정)으로 두세요.');
    return {
      run_id,
      skipped: false,
      success: false,
      error: 'LLM not configured',
      output: { results: [] },
    };
  }

  const batch = await processAndPersistKnowledgeBatch(limit);

  if (batch.dbError) {
    await logFail(rowId, {
      error_code: 'DB_QUERY_FAILED',
      error_message: batch.dbError,
      current_retry_count: 0,
    });
    return { run_id, skipped: false, success: false, error: batch.dbError };
  }

  if (batch.results.length === 0) {
    await logSuccess(rowId, {
      output_payload: { message: '처리할 raw_knowledge 없음', results: [] },
      metrics_after: { processed: 0, failed: 0, noop: true },
    });
    console.log(`[KnowledgeProcess] ✓ noop (할 일 없음) run_id=${run_id}`);
    return { run_id, skipped: false, success: true, output: { processed: 0, failed: 0, results: [] } };
  }

  const okCount = batch.results.filter((r) => r.ok).length;
  const failCount = batch.results.filter((r) => !r.ok).length;

  if (failCount > 0 && okCount === 0) {
    const firstErr = batch.results.find((r) => r.error)?.error ?? 'all failed';
    await logFail(rowId, {
      error_code: 'PROCESS_BATCH_FAILED',
      error_message: firstErr,
      current_retry_count: 0,
    });
    console.error(`[KnowledgeProcess] ✗ FAILED run_id=${run_id} all ${failCount} failed`);
    return {
      run_id,
      skipped: false,
      success: false,
      error: firstErr,
      output: { processed: 0, failed: failCount, results: batch.results },
    };
  }

  const outputPayload = { processed: okCount, failed: failCount, results: batch.results };
  await logSuccess(rowId, {
    output_payload: outputPayload,
    metrics_after: { processed: okCount, failed: failCount },
  });

  console.log(`[KnowledgeProcess] ✓ SUCCESS run_id=${run_id} ok=${okCount} fail=${failCount}`);
  return { run_id, skipped: false, success: true, output: outputPayload };
}
