/**
 * persistRawNews.ts — RSS 수집 결과를 news_sources / raw_news 에 저장 (v2 스키마)
 *
 * 스키마: supabase/schema_v2_fresh_start.sql
 * 비활성: NEWS_PERSIST_TO_DB=false
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';
import type { CollectedArticle } from './collectArticles';

export interface PersistRawNewsResult {
  attempted: boolean;
  /** upsert 시도한 raw_news 행 수(중복 URL은 1행으로 합침) */
  upserted: number;
  /** 이번 실행에서 새로 만든 news_sources 행 수 */
  sources_created: number;
  error?: string;
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function feedLabel(feedUrl: string): string {
  try {
    return new URL(feedUrl).hostname;
  } catch {
    return feedUrl.slice(0, 200);
  }
}

/**
 * 수집된 기사를 DB에 반영합니다. 같은 external_url 은 upsert 로 갱신(fetched_at 등).
 */
export async function persistCollectedArticlesToDb(
  articles: CollectedArticle[],
): Promise<PersistRawNewsResult> {
  if (process.env.NEWS_PERSIST_TO_DB === 'false') {
    return { attempted: false, upserted: 0, sources_created: 0 };
  }

  const filtered = articles.filter((a) => a.link && isValidHttpUrl(a.link));
  if (filtered.length === 0) {
    return { attempted: true, upserted: 0, sources_created: 0 };
  }

  const client = getServerSupabaseClient();
  const feedToSourceId = new Map<string, string>();
  let sourcesCreated = 0;

  const uniqueFeeds = [...new Set(filtered.map((a) => a.feed_url))];

  for (const feedUrl of uniqueFeeds) {
    const { data: existing, error: selErr } = await client
      .from('news_sources')
      .select('id')
      .eq('feed_url', feedUrl)
      .maybeSingle();

    if (selErr) {
      return {
        attempted: true,
        upserted: 0,
        sources_created: sourcesCreated,
        error: `[news_sources select] ${selErr.message}`,
      };
    }

    if (existing?.id) {
      feedToSourceId.set(feedUrl, existing.id);
      continue;
    }

    const { data: inserted, error: insErr } = await client
      .from('news_sources')
      .insert({ name: feedLabel(feedUrl), feed_url: feedUrl, is_active: true })
      .select('id')
      .single();

    if (insErr || !inserted?.id) {
      return {
        attempted: true,
        upserted: 0,
        sources_created: sourcesCreated,
        error: `[news_sources insert] ${insErr?.message ?? 'no id'}`,
      };
    }

    feedToSourceId.set(feedUrl, inserted.id);
    sourcesCreated += 1;
  }

  const now = new Date().toISOString();
  const rowMap = new Map<
    string,
    {
      external_url: string;
      title: string;
      raw_body: string | null;
      published_at: string | null;
      source_id: string | null;
      fetched_at: string;
    }
  >();

  for (const a of filtered) {
    const title = (a.title?.trim() || '(제목 없음)').slice(0, 10000);
    rowMap.set(a.link, {
      external_url: a.link,
      title,
      raw_body: null,
      published_at: a.published_at ?? null,
      source_id: feedToSourceId.get(a.feed_url) ?? null,
      fetched_at: now,
    });
  }

  const rows = Array.from(rowMap.values());
  const chunkSize = 200;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error: upErr } = await client.from('raw_news').upsert(chunk, {
      onConflict: 'external_url',
    });

    if (upErr) {
      return {
        attempted: true,
        upserted: 0,
        sources_created: sourcesCreated,
        error: `[raw_news upsert] ${upErr.message}`,
      };
    }
  }

  return {
    attempted: true,
    upserted: rows.length,
    sources_created: sourcesCreated,
  };
}
