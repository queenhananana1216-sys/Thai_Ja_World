import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { batchPublishGoogleIndexingUrlUpdates, isGoogleIndexingConfigured } from '@/lib/seo/googleIndexingApi';
import { getSiteBaseUrl } from '@/lib/seo/site';
import { recordPipelineErrorEvent } from '@/lib/pipeline/pipelineErrorLearning';

const SETTINGS_KEY = 'seo.indexing_batch_last';

export type RetrofitIndexingSweepResult = {
  ran: boolean;
  candidate_urls: number;
  submitted: number;
  failed: number;
  batches: number;
  errors: string[];
};

/**
 * 레트로핏·대량 갱신 후 — 발행 뉴스·공개 게시 상한 URL을 끊어 Indexing API로 순차 전송.
 * 구글 일일 쿼터(기본 200)를 넘기지 않도록 `maxPublishTotal` 상한을 둔다.
 */
export async function runRetrofitIndexingSweep(
  admin: SupabaseClient,
  opts?: {
    newsLimit?: number;
    postsLimit?: number;
    /** 한 번의 호출에서 시도하는 최대 성공+실패 합(기본 160) */
    maxPublishTotal?: number;
    perBatchMaxUrls?: number;
    delayMs?: number;
  },
): Promise<RetrofitIndexingSweepResult> {
  const empty: RetrofitIndexingSweepResult = {
    ran: false,
    candidate_urls: 0,
    submitted: 0,
    failed: 0,
    batches: 0,
    errors: [],
  };
  if (!isGoogleIndexingConfigured()) return empty;

  const base = getSiteBaseUrl();
  const newsLimit = Math.min(opts?.newsLimit ?? 600, 1200);
  const postsLimit = Math.min(opts?.postsLimit ?? 800, 2000);
  const maxPublishTotal = Math.min(opts?.maxPublishTotal ?? 160, 190);
  const perBatch = Math.min(opts?.perBatchMaxUrls ?? 72, 90);
  const delayMs = opts?.delayMs ?? 140;

  const urls: string[] = [`${base}/weather`, `${base}/news`, `${base}/community/boards`, `${base}/tips`];

  const [{ data: newsRows }, { data: postRows }] = await Promise.all([
    admin
      .from('processed_news')
      .select('id')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(newsLimit),
    admin
      .from('posts')
      .select('id, is_knowledge_tip, category')
      .eq('moderation_status', 'safe')
      .eq('author_hidden', false)
      .order('updated_at', { ascending: false })
      .limit(postsLimit),
  ]);

  for (const row of newsRows ?? []) {
    urls.push(`${base}/news/${encodeURIComponent(String(row.id))}`);
  }
  for (const row of postRows ?? []) {
    const id = String(row.id);
    const isTip =
      Boolean((row as { is_knowledge_tip?: boolean }).is_knowledge_tip) &&
      String((row as { category?: string }).category ?? '') === 'info';
    urls.push(
      `${base}${isTip ? `/tips/${encodeURIComponent(id)}` : `/community/boards/${encodeURIComponent(id)}`}`,
    );
  }

  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  const result: RetrofitIndexingSweepResult = {
    ran: true,
    candidate_urls: unique.length,
    submitted: 0,
    failed: 0,
    batches: 0,
    errors: [],
  };

  let offset = 0;
  while (offset < unique.length && result.submitted + result.failed < maxPublishTotal) {
    const slice = unique.slice(offset, offset + perBatch);
    if (!slice.length) break;
    const batch = await batchPublishGoogleIndexingUrlUpdates(slice, {
      maxUrls: perBatch,
      delayMs,
    });
    result.batches += 1;
    result.submitted += batch.submitted;
    result.failed += batch.failed;
    result.errors.push(...batch.errors);
    offset += perBatch;
    if (batch.submitted + batch.failed === 0) break;
  }

  const at = new Date().toISOString();
  const { error: upErr } = await admin.from('site_settings').upsert(
    {
      key: SETTINGS_KEY,
      value: {
        at,
        ok: result.failed === 0,
        submitted: result.submitted,
        failed: result.failed,
        candidates: result.candidate_urls,
        sweep: 'retrofit_indexing',
      },
      updated_at: at,
    },
    { onConflict: 'key' },
  );
  if (upErr) {
    await recordPipelineErrorEvent({
      scope: 'seo.google_indexing',
      reasonCode: 'SITE_SETTINGS_UPSERT',
      messageExcerpt: upErr.message,
    });
  }

  return result;
}
