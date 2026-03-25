/**
 * runCollectLoop.ts — 뉴스/기사 피드 수집 오케스트레이터 (bot_actions: collect_data)
 */

import { randomUUID } from 'node:crypto';
import { isDuplicate, logFail, logStart, logSuccess } from '../logging/botActionLogger';
import { collectArticles, type CollectArticlesOutput } from '../actions/collectArticles';
import { persistCollectedArticlesToDb } from '../actions/persistRawNews';

export interface RunCollectLoopOptions {
  idempotencyKey?: string;
  /** 피드당 항목 수 (1–50), env NEWS_ITEMS_PER_FEED 기본값을 덮어씀 */
  itemsPerFeed?: number;
}

export interface RunCollectLoopResult {
  run_id: string;
  skipped: boolean;
  success?: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

const BOT_NAME = 'news_curator' as const;
const ACTION_TYPE = 'collect_data' as const;
const OBJECTIVE = 'RSS/Atom 피드에서 기사 메타데이터 수집' as const;
const PRIORITY = 3 as const;

export async function runCollectLoop(
  options: RunCollectLoopOptions = {},
): Promise<RunCollectLoopResult> {
  const { idempotencyKey, itemsPerFeed } = options;
  const run_id = randomUUID();

  const inputPayload: Record<string, unknown> = {};
  if (idempotencyKey) inputPayload.idempotencyKey = idempotencyKey;
  if (itemsPerFeed !== undefined) inputPayload.itemsPerFeed = itemsPerFeed;

  console.log(`[RunCollectLoop] 시작 run_id=${run_id} bot=${BOT_NAME}`);

  if (idempotencyKey) {
    const duplicate = await isDuplicate(BOT_NAME, idempotencyKey);
    if (duplicate) {
      console.log(`[RunCollectLoop] SKIP — 중복 idempotencyKey: ${idempotencyKey}`);
      return { run_id, skipped: true };
    }
  }

  const rowId = await logStart({
    run_id,
    bot_name: BOT_NAME,
    action_type: ACTION_TYPE,
    objective: OBJECTIVE,
    target_entity: 'external_feed',
    priority: PRIORITY,
    input_payload: inputPayload,
  });

  if (!rowId) {
    return {
      run_id,
      skipped: false,
      success: false,
      error: 'DB insert failed at logStart — 환경 변수 또는 네트워크를 확인하세요.',
    };
  }

  const result = await collectArticles(inputPayload);

  if (result.success) {
    const out = result.output as CollectArticlesOutput;
    const persist = await persistCollectedArticlesToDb(out.articles);
    const outputPayload = {
      ...(out as unknown as Record<string, unknown>),
      persist_raw_news: persist,
    };

    await logSuccess(rowId, {
      output_payload: outputPayload,
      metrics_after: {
        article_count: out.articles.length,
        feeds_ok: out.feeds_succeeded.length,
        feeds_err: out.feeds_failed.length,
        raw_news_upserted: persist.upserted,
        news_sources_created: persist.sources_created,
        raw_news_persist_attempted: persist.attempted,
        ...(persist.error ? { raw_news_persist_error: persist.error } : {}),
      },
    });

    if (persist.error) {
      console.warn(`[RunCollectLoop] RSS 수집 OK, DB 저장 경고: ${persist.error}`);
    }
    console.log(
      `[RunCollectLoop] ✓ SUCCESS run_id=${run_id} articles=${out.articles.length} raw_news_upserted=${persist.upserted}`,
    );
    return { run_id, skipped: false, success: true, output: outputPayload };
  }

  const out = result.output as CollectArticlesOutput;
  const outputPayload = out as unknown as Record<string, unknown>;

  await logFail(rowId, {
    error_code: 'COLLECT_ARTICLES_FAILED',
    error_message: result.error?.message ?? 'collectArticles failed',
    current_retry_count: 0,
  });

  console.error(`[RunCollectLoop] ✗ FAILED run_id=${run_id}:`, result.error?.message);
  return {
    run_id,
    skipped: false,
    success: false,
    error: result.error?.message ?? 'Unknown failure',
    output: outputPayload,
  };
}
