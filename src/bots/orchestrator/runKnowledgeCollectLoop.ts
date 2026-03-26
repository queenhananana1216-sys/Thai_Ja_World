/**
 * runKnowledgeCollectLoop.ts — knowledge_sources 수집 오케스트레이터
 * bot_name: knowledge_curator_collect / action_type: collect_data
 */

import { randomUUID } from 'node:crypto';
import { isDuplicate, logFail, logStart, logSuccess } from '../logging/botActionLogger';
import { collectKnowledge, type CollectKnowledgeOutput } from '../actions/collectKnowledge';
import { persistCollectedKnowledgeToDb } from '../actions/persistRawKnowledge';

export interface RunKnowledgeCollectOptions {
  idempotencyKey?: string;
  /** 소스당 항목 수 (1–20), env KNOWLEDGE_ITEMS_PER_SOURCE 기본값 덮어씀 */
  itemsPerSource?: number;
}

export interface RunKnowledgeCollectResult {
  run_id: string;
  skipped: boolean;
  success?: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

const BOT_NAME = 'knowledge_curator_collect' as const;
const ACTION_TYPE = 'collect_data' as const;
const OBJECTIVE = 'knowledge_sources 에서 비자/꿀팁 컨텐츠 수집 → raw_knowledge 적재' as const;
const PRIORITY = 3 as const;

export async function runKnowledgeCollectLoop(
  options: RunKnowledgeCollectOptions = {},
): Promise<RunKnowledgeCollectResult> {
  const { idempotencyKey, itemsPerSource } = options;
  const run_id = randomUUID();

  const inputPayload: Record<string, unknown> = {};
  if (idempotencyKey) inputPayload.idempotencyKey = idempotencyKey;
  if (itemsPerSource !== undefined) inputPayload.itemsPerSource = itemsPerSource;

  console.log(`[KnowledgeCollect] 시작 run_id=${run_id}`);

  if (idempotencyKey) {
    const duplicate = await isDuplicate(BOT_NAME, idempotencyKey);
    if (duplicate) {
      console.log(`[KnowledgeCollect] SKIP — 중복 key: ${idempotencyKey}`);
      return { run_id, skipped: true };
    }
  }

  const rowId = await logStart({
    run_id,
    bot_name: BOT_NAME,
    action_type: ACTION_TYPE,
    objective: OBJECTIVE,
    target_entity: 'knowledge_sources',
    priority: PRIORITY,
    input_payload: inputPayload,
  });

  if (!rowId) {
    return { run_id, skipped: false, success: false, error: 'DB logStart failed — 환경 변수 확인' };
  }

  const result = await collectKnowledge(inputPayload);

  if (result.success) {
    const out = result.output as CollectKnowledgeOutput;
    const persist = await persistCollectedKnowledgeToDb(out.items);
    const outputPayload = {
      ...(out as unknown as Record<string, unknown>),
      persist_raw_knowledge: persist,
    };

    await logSuccess(rowId, {
      output_payload: outputPayload,
      metrics_after: {
        items_collected: out.items.length,
        sources_ok: out.sources_succeeded.length,
        sources_err: out.sources_failed.length,
        raw_knowledge_upserted: persist.upserted,
        ...(persist.error ? { raw_knowledge_persist_error: persist.error } : {}),
      },
    });

    console.log(`[KnowledgeCollect] ✓ SUCCESS run_id=${run_id} items=${out.items.length} upserted=${persist.upserted}`);
    return { run_id, skipped: false, success: true, output: outputPayload };
  }

  await logFail(rowId, {
    error_code: 'COLLECT_KNOWLEDGE_FAILED',
    error_message: result.error?.message ?? 'collectKnowledge failed',
    current_retry_count: 0,
  });

  console.error(`[KnowledgeCollect] ✗ FAILED run_id=${run_id}:`, result.error?.message);
  return {
    run_id,
    skipped: false,
    success: false,
    error: result.error?.message ?? 'Unknown failure',
    output: result.output as unknown as Record<string, unknown>,
  };
}
