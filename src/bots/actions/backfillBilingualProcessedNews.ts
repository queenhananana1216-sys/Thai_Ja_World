/**
 * 예전에 ko 만 있던 processed_news 를 지우고, 같은 raw_news 에 대해 한·태 이중 요약을 다시 생성합니다.
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';
import { sendNewsSummarySlackDigest } from './notifyNewsSlack';
import {
  isNewsSummaryLlmConfigured,
  summarizeAndPersistNewsBatch,
  type SummarizeBatchResult,
} from './summarizeAndPersistNews';

export type BackfillBilingualResult = {
  scanned: number;
  deleted_ids: number;
  summarize: SummarizeBatchResult;
};

function needsThBackfill(cleanBody: string | null | undefined): boolean {
  if (!cleanBody?.trim()) return true;
  try {
    const o = JSON.parse(cleanBody) as {
      th?: { title?: string; summary?: string };
    };
    const title = o.th?.title?.trim();
    const summary = o.th?.summary?.trim();
    return !title || !summary;
  } catch {
    return true;
  }
}

/**
 * @param deleteMax — 삭제할 processed_news 최대 개수 (다시 요약할 raw 슬롯)
 * @param summarizeLimit — 삭제 직후 summarizeAndPersistNewsBatch 에 넘기는 limit
 */
export async function backfillBilingualProcessedNews(
  deleteMax: number,
  summarizeLimit: number,
): Promise<BackfillBilingualResult> {
  const client = getServerSupabaseClient();
  const cap = Math.min(Math.max(deleteMax, 1), 100);
  const sumLimit = Math.min(Math.max(summarizeLimit, 1), 30);

  const { data: rows, error } = await client
    .from('processed_news')
    .select('id, clean_body')
    .order('created_at', { ascending: false })
    .limit(800);

  if (error) {
    return {
      scanned: 0,
      deleted_ids: 0,
      summarize: {
        results: [],
        llmConfigured: isNewsSummaryLlmConfigured(),
        openaiConfigured: isNewsSummaryLlmConfigured(),
        dbError: `[processed_news select] ${error.message}`,
      },
    };
  }

  const toDelete = (rows ?? [])
    .filter((r) => needsThBackfill(r.clean_body as string | null))
    .slice(0, cap)
    .map((r) => r.id as string);

  if (toDelete.length > 0) {
    const { error: delErr } = await client.from('processed_news').delete().in('id', toDelete);
    if (delErr) {
      return {
        scanned: rows?.length ?? 0,
        deleted_ids: 0,
        summarize: {
          results: [],
          llmConfigured: isNewsSummaryLlmConfigured(),
          openaiConfigured: isNewsSummaryLlmConfigured(),
          dbError: `[processed_news delete] ${delErr.message}`,
        },
      };
    }
  }

  const summarize = await summarizeAndPersistNewsBatch(sumLimit);
  await sendNewsSummarySlackDigest(summarize.slackDigest);
  return {
    scanned: rows?.length ?? 0,
    deleted_ids: toDelete.length,
    summarize,
  };
}
