/**
 * persistRawKnowledge.ts — collectKnowledge 결과를 raw_knowledge 에 upsert
 *
 * external_url unique 제약 기준 upsert.
 * KNOWLEDGE_UPSERT_IGNORE_DUPLICATES 가 false 가 아니면(기본) 이미 있는 URL 은 갱신 없이 건너뜀.
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

function upsertIgnoreDuplicates(): boolean {
  return process.env.KNOWLEDGE_UPSERT_IGNORE_DUPLICATES !== 'false';
}

export async function persistCollectedKnowledgeToDb(
  items: CollectedKnowledgeItem[],
): Promise<PersistRawKnowledgeResult> {
  const valid = items.filter((i) => i.external_url && isValidHttpUrl(i.external_url));
  if (!valid.length) {
    return { attempted: 0, upserted: 0, skipped: 0 };
  }

  const client = getServerSupabaseClient();
  const ignoreDuplicates = upsertIgnoreDuplicates();

  const rows = valid.map((i) => ({
    source_id: i.source_id,
    external_url: i.external_url,
    title_original: i.title_original || null,
    raw_body: i.raw_body ?? null,
    fetched_at: new Date().toISOString(),
    published_at: i.published_at ?? null,
    content_hash: i.content_hash ?? null,
  }));

  const { data, error } = await client
    .from('raw_knowledge')
    .upsert(rows, { onConflict: 'external_url', ignoreDuplicates })
    .select('id');

  if (error) {
    return {
      attempted: valid.length,
      upserted: 0,
      skipped: 0,
      error: `[raw_knowledge upsert] ${error.message}`,
    };
  }

  const upserted = data?.length ?? 0;
  return {
    attempted: valid.length,
    upserted,
    skipped: Math.max(0, valid.length - upserted),
  };
}
