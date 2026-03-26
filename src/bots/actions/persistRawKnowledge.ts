/**
 * persistRawKnowledge.ts — collectKnowledge 결과를 raw_knowledge 에 upsert
 *
 * external_url unique 제약 기준으로 upsert (중복 스킵).
 * raw_body 길이 제한은 collectKnowledge 에서 이미 적용됨.
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';
import type { CollectedKnowledgeItem } from './collectKnowledge';

export interface PersistRawKnowledgeResult {
  attempted: number;
  upserted: number;
  skipped: number;
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

export async function persistCollectedKnowledgeToDb(
  items: CollectedKnowledgeItem[],
): Promise<PersistRawKnowledgeResult> {
  const valid = items.filter((i) => i.external_url && isValidHttpUrl(i.external_url));
  if (!valid.length) {
    return { attempted: 0, upserted: 0, skipped: 0 };
  }

  const client = getServerSupabaseClient();

  // external_url unique 제약 기준 upsert — 중복 URL은 fetched_at 만 갱신
  const rows = valid.map((i) => ({
    source_id: i.source_id,
    external_url: i.external_url,
    title_original: i.title_original || null,
    raw_body: i.raw_body ?? null,
    fetched_at: new Date().toISOString(),
    published_at: i.published_at ?? null,
    content_hash: i.content_hash ?? null,
  }));

  const { error, count } = await client
    .from('raw_knowledge')
    .upsert(rows, { onConflict: 'external_url', ignoreDuplicates: false })
    .select();

  if (error) {
    return {
      attempted: valid.length,
      upserted: 0,
      skipped: 0,
      error: `[raw_knowledge upsert] ${error.message}`,
    };
  }

  const upserted = count ?? valid.length;
  return { attempted: valid.length, upserted, skipped: Math.max(0, valid.length - upserted) };
}
