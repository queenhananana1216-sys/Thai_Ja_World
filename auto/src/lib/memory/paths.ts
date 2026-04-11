import path from 'node:path';

/** 외장 메모리 JSONL 경로 — 기본: <cwd>/.data/external-memory.jsonl */
export function getMemoryStorePath(): string {
  const custom = process.env.MEMORY_STORE_PATH?.trim();
  if (custom) return path.resolve(custom);
  return path.join(process.cwd(), '.data', 'external-memory.jsonl');
}
