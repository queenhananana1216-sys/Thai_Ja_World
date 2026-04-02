/**
 * 승인 대기(processed_knowledge.published=false) 중 스텁(LLM 미가공) 초안을
 * 원문 URL 기준으로 다시 LLM 가공합니다.
 *
 * 배경: knowledge-process 배치는 «processed 가 없는 raw»만 처리합니다.
 * 스텁 초안은 이미 processed 행이 있어 크론이 영구히 건너뛰므로, 별도 루프가 필요합니다.
 */

import { randomUUID } from 'node:crypto';
import { logFail, logStart, logSuccess } from '../logging/botActionLogger';
import {
  isKnowledgeLlmConfigured,
  reprocessKnowledgeDraftWithLlm,
} from '../actions/processAndPersistKnowledge';
import { getServerSupabaseClient } from '../adapters/supabaseClient';
import { parseKnowledgeCleanBody } from '@/lib/knowledge/knowledgeQueuePublishCore';
import { isKnowledgeStubKoSummary } from '@/lib/knowledge/knowledgeStubConstants';

const BOT_NAME = 'knowledge_stub_repair' as const;
const ACTION_TYPE = 'analyze' as const;
const OBJECTIVE = '스텁 초안 LLM 재가공 (clean_body → 원문 재수집 → LLM)' as const;
const PRIORITY = 4 as const;

export interface RunKnowledgeStubRepairOptions {
  /** 한 번에 재가공 시도할 최대 건수 (기본 5, 최대 12) */
  limit?: number;
}

export interface RunKnowledgeStubRepairResult {
  run_id: string;
  success: boolean;
  error?: string;
  output?: {
    scanned: number;
    stub_candidates: number;
    attempted: number;
    ok: number;
    failed: number;
    results: Array<{ id: string; ok: boolean; error?: string }>;
  };
}

function cleanBodyLooksStub(cleanBody: unknown): boolean {
  const llm = parseKnowledgeCleanBody(cleanBody);
  const sum = llm?.ko?.summary?.trim() ?? '';
  if (!sum) return true;
  return isKnowledgeStubKoSummary(sum);
}

export async function runKnowledgeStubRepairLoop(
  options: RunKnowledgeStubRepairOptions = {},
): Promise<RunKnowledgeStubRepairResult> {
  const run_id = randomUUID();
  const envCap = Number(process.env.KNOWLEDGE_STUB_REPAIR_BATCH_SIZE);
  const defaultLimit = Number.isFinite(envCap) && envCap >= 1 ? Math.min(envCap, 12) : 5;
  const limit = Math.min(Math.max(options.limit ?? defaultLimit, 1), 12);

  console.log(`[KnowledgeStubRepair] 시작 run_id=${run_id} limit=${limit}`);

  if (!isKnowledgeLlmConfigured()) {
    return {
      run_id,
      success: false,
      error: 'LLM not configured (GEMINI_API_KEY / OPENAI_API_KEY / LOCAL_LLM_BASE_URL)',
    };
  }

  const client = getServerSupabaseClient();
  const { data: rows, error: qErr } = await client
    .from('processed_knowledge')
    .select('id, clean_body')
    .eq('published', false)
    .order('created_at', { ascending: true })
    .limit(200);

  if (qErr) {
    return { run_id, success: false, error: `[processed_knowledge] ${qErr.message}` };
  }

  const list = rows ?? [];
  const stubIds: string[] = [];
  for (const row of list) {
    if (cleanBodyLooksStub(row.clean_body)) {
      stubIds.push(String(row.id));
    }
  }

  const toFix = stubIds.slice(0, limit);
  const inputPayload = { limit, scanned: list.length, stub_candidates: stubIds.length, attempted: toFix.length };

  const rowId = await logStart({
    run_id,
    bot_name: BOT_NAME,
    action_type: ACTION_TYPE,
    objective: OBJECTIVE,
    target_entity: 'processed_knowledge',
    priority: PRIORITY,
    input_payload: inputPayload,
  });

  if (!rowId) {
    return { run_id, success: false, error: 'DB logStart failed' };
  }

  if (toFix.length === 0) {
    const out = {
      scanned: list.length,
      stub_candidates: stubIds.length,
      attempted: 0,
      ok: 0,
      failed: 0,
      results: [] as Array<{ id: string; ok: boolean; error?: string }>,
    };
    await logSuccess(rowId, {
      output_payload: { message: '재가공할 스텁 초안 없음', ...out },
      metrics_after: { processed: 0, failed: 0, noop: true },
    });
    return { run_id, success: true, output: out };
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const id of toFix) {
    const r = await reprocessKnowledgeDraftWithLlm(id);
    results.push({ id, ok: r.ok, error: r.error });
  }

  const ok = results.filter((x) => x.ok).length;
  const failed = results.length - ok;

  if (failed > 0 && ok === 0) {
    const firstErr = results.find((x) => x.error)?.error ?? 'all failed';
    await logFail(rowId, {
      error_code: 'STUB_REPAIR_ALL_FAILED',
      error_message: firstErr,
      current_retry_count: 0,
    });
    return {
      run_id,
      success: false,
      error: firstErr,
      output: {
        scanned: list.length,
        stub_candidates: stubIds.length,
        attempted: toFix.length,
        ok,
        failed,
        results,
      },
    };
  }

  const outputPayload = {
    scanned: list.length,
    stub_candidates: stubIds.length,
    attempted: toFix.length,
    ok,
    failed,
    results,
  };
  await logSuccess(rowId, {
    output_payload: outputPayload,
    metrics_after: { processed: ok, failed },
  });

  console.log(`[KnowledgeStubRepair] ✓ run_id=${run_id} ok=${ok} fail=${failed}`);
  return { run_id, success: true, output: outputPayload };
}
