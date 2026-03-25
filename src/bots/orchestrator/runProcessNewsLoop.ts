/**
 * runProcessNewsLoop.ts — raw_news 요약·번역 배치 (bot_actions: analyze)
 */

import { randomUUID } from 'node:crypto';
import { isDuplicate, logFail, logSkip, logStart, logSuccess } from '../logging/botActionLogger';
import { sendNewsSummarySlackDigest } from '../actions/notifyNewsSlack';
import { summarizeAndPersistNewsBatch } from '../actions/summarizeAndPersistNews';

export interface RunProcessNewsOptions {
  idempotencyKey?: string;
  /** 한 번에 처리할 미가공 기사 수 (1–30) */
  limit?: number;
}

export interface RunProcessNewsResult {
  run_id: string;
  skipped: boolean;
  success?: boolean;
  error?: string;
  output?: Record<string, unknown>;
}

const BOT_NAME = 'news_summarizer' as const;
const ACTION_TYPE = 'analyze' as const;
const OBJECTIVE = 'raw_news 한국어·태국어 제목·요약 생성 및 DB 반영 (홈 뉴스 로케일별 표시)' as const;
const PRIORITY = 3 as const;

export async function runProcessNewsLoop(
  options: RunProcessNewsOptions = {},
): Promise<RunProcessNewsResult> {
  const { idempotencyKey, limit: limitOpt } = options;
  const envBatch = Number(process.env.NEWS_SUMMARIZE_BATCH_SIZE);
  const defaultLimit = Number.isFinite(envBatch) && envBatch >= 1 ? Math.min(envBatch, 30) : 8;
  const limit = limitOpt ?? defaultLimit;
  const run_id = randomUUID();

  const inputPayload: Record<string, unknown> = { limit };
  if (idempotencyKey) inputPayload.idempotencyKey = idempotencyKey;

  console.log(`[RunProcessNews] 시작 run_id=${run_id} limit=${limit}`);

  if (idempotencyKey) {
    const duplicate = await isDuplicate(BOT_NAME, idempotencyKey);
    if (duplicate) {
      console.log(`[RunProcessNews] SKIP — 중복 idempotencyKey: ${idempotencyKey}`);
      return { run_id, skipped: true };
    }
  }

  const rowId = await logStart({
    run_id,
    bot_name: BOT_NAME,
    action_type: ACTION_TYPE,
    objective: OBJECTIVE,
    target_entity: 'raw_news',
    priority: PRIORITY,
    input_payload: inputPayload,
  });

  if (!rowId) {
    return {
      run_id,
      skipped: false,
      success: false,
      error: 'DB insert failed at logStart',
    };
  }

  const batch = await summarizeAndPersistNewsBatch(limit);

  if (batch.dbError) {
    await logFail(rowId, {
      error_code: 'DB_QUERY_FAILED',
      error_message: batch.dbError,
      current_retry_count: 0,
    });
    console.error(`[RunProcessNews] ✗ DB error run_id=${run_id}:`, batch.dbError);
    return {
      run_id,
      skipped: false,
      success: false,
      error: batch.dbError,
    };
  }

  if (!batch.llmConfigured) {
    await logSkip(rowId, 'LLM 미설정 — OPENAI_API_KEY 또는 LOCAL_LLM_BASE_URL 필요');
    console.warn('[RunProcessNews] 요약용 LLM 미설정 (NEWS_SUMMARY_PROVIDER / 키·URL 확인)');
    return {
      run_id,
      skipped: false,
      success: false,
      error: 'LLM not configured (OPENAI_API_KEY or LOCAL_LLM_BASE_URL)',
      output: { batch: batch.results },
    };
  }

  const okCount = batch.results.filter((r) => r.ok).length;
  const failCount = batch.results.filter((r) => !r.ok).length;

  if (batch.results.length === 0) {
    await logSuccess(rowId, {
      output_payload: { message: '처리할 미가공 기사 없음', results: [] },
      metrics_after: { processed: 0, failed: 0, noop: true },
    });
    console.log(`[RunProcessNews] ✓ noop (할 일 없음) run_id=${run_id}`);
    return {
      run_id,
      skipped: false,
      success: true,
      output: { processed: 0, failed: 0, results: [] },
    };
  }

  if (failCount > 0 && okCount === 0) {
    const firstErr = batch.results.find((r) => r.error)?.error ?? 'all failed';
    await logFail(rowId, {
      error_code: 'SUMMARIZE_BATCH_FAILED',
      error_message: firstErr,
      current_retry_count: 0,
    });
    console.error(`[RunProcessNews] ✗ FAILED run_id=${run_id}:`, firstErr);
    return {
      run_id,
      skipped: false,
      success: false,
      error: firstErr,
      output: { results: batch.results },
    };
  }

  await logSuccess(rowId, {
    output_payload: { results: batch.results },
    metrics_after: {
      attempted: batch.results.length,
      succeeded: okCount,
      failed: failCount,
    },
  });

  console.log(
    `[RunProcessNews] ✓ SUCCESS run_id=${run_id} ok=${okCount} fail=${failCount}`,
  );

  await sendNewsSummarySlackDigest(batch.slackDigest);

  return {
    run_id,
    skipped: false,
    success: true,
    output: {
      attempted: batch.results.length,
      succeeded: okCount,
      failed: failCount,
      results: batch.results,
    },
  };
}
