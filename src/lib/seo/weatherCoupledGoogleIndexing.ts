import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { batchPublishGoogleIndexingUrlUpdates, isGoogleIndexingConfigured } from '@/lib/seo/googleIndexingApi';
import { getSiteBaseUrl } from '@/lib/seo/site';
import { recordPipelineErrorEvent } from '@/lib/pipeline/pipelineErrorLearning';

const SETTINGS_KEY = 'seo.indexing_batch_last';

/**
 * 날씨 스냅샷 등 Open-Meteo가 정상일 때 — 최근 24h 갱신된 뉴스·인기 글·날씨 허브를 Indexing API로 일괄 통지.
 * (일일 쿼터 고려해 상한 `maxUrls` 적용)
 */
export async function runWeatherCoupledGoogleIndexingPass(admin: SupabaseClient): Promise<{
  ran: boolean;
  submitted: number;
  failed: number;
  candidate_urls: number;
}> {
  if (!isGoogleIndexingConfigured()) {
    return { ran: false, submitted: 0, failed: 0, candidate_urls: 0 };
  }

  const base = getSiteBaseUrl();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const urls: string[] = [`${base}/weather`];

  const { data: newsRows } = await admin
    .from('processed_news')
    .select('id')
    .eq('published', true)
    .gte('created_at', since)
    .limit(28);
  for (const row of newsRows ?? []) {
    urls.push(`${base}/news/${encodeURIComponent(String(row.id))}`);
  }

  const { data: postRows } = await admin
    .from('posts')
    .select('id, is_knowledge_tip, category, view_count')
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .gte('updated_at', since)
    .order('view_count', { ascending: false })
    .limit(32);
  for (const row of postRows ?? []) {
    const id = String(row.id);
    const isTip =
      Boolean((row as { is_knowledge_tip?: boolean }).is_knowledge_tip) &&
      String((row as { category?: string }).category ?? '') === 'info';
    urls.push(
      `${base}${isTip ? `/tips/${encodeURIComponent(id)}` : `/community/boards/${encodeURIComponent(id)}`}`,
    );
  }

  const batch = await batchPublishGoogleIndexingUrlUpdates(urls, { maxUrls: 48, delayMs: 170 });
  const at = new Date().toISOString();

  const { error: upErr } = await admin.from('site_settings').upsert(
    {
      key: SETTINGS_KEY,
      value: {
        at,
        ok: batch.failed === 0,
        submitted: batch.submitted,
        failed: batch.failed,
        candidates: urls.length,
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

  return {
    ran: true,
    submitted: batch.submitted,
    failed: batch.failed,
    candidate_urls: urls.length,
  };
}
