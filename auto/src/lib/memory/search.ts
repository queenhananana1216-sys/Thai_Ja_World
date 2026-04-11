import type { MemoryEntry } from '@/lib/memory/types';
import { loadAllEntries } from '@/lib/memory/store';

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}_-]/gu, ''))
    .filter((t) => t.length > 0);
}

/** 단순 토큰 매칭 점수 — 임베딩 없이 로컬 전용 */
export async function searchMemory(query: string, limit = 8): Promise<MemoryEntry[]> {
  const all = await loadAllEntries();
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return all.slice(-limit).reverse();
  }

  const scored = all.map((e) => {
    const hay = `${e.text} ${(e.tags ?? []).join(' ')}`.toLowerCase();
    let s = 0;
    for (const tok of tokens) {
      if (hay.includes(tok)) s += 1;
    }
    return { e, s };
  });

  return scored
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.e.createdAt.localeCompare(a.e.createdAt))
    .slice(0, limit)
    .map((x) => x.e);
}
