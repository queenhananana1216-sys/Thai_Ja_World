/**
 * raw_news 중 오래된 행 삭제 → CASCADE 로 processed_news·summaries·news_comments 정리
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';

export type PurgeStaleNewsResult = {
  ok: boolean;
  /** 삭제 시도 전 조건에 맞는 대략적인 건수(선택) */
  matched?: number;
  error?: string;
};

export async function purgeStaleRawNews(): Promise<PurgeStaleNewsResult> {
  const raw = process.env.NEWS_RETENTION_DAYS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 7;
  const days = Number.isFinite(n) && n >= 1 ? Math.min(n, 90) : 7;

  const client = getServerSupabaseClient();
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  const { count, error: cErr } = await client
    .from('raw_news')
    .select('id', { count: 'exact', head: true })
    .lt('fetched_at', cutoff);

  if (cErr) {
    return { ok: false, error: `[count] ${cErr.message}` };
  }

  const { error: delErr } = await client.from('raw_news').delete().lt('fetched_at', cutoff);

  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  return { ok: true, matched: count ?? undefined };
}
