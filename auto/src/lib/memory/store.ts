import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MemoryEntry } from '@/lib/memory/types';
import { getMemoryStorePath } from '@/lib/memory/paths';

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

function parseLine(line: string): MemoryEntry | null {
  const t = line.trim();
  if (!t) return null;
  try {
    const o = JSON.parse(t) as MemoryEntry;
    if (typeof o.id === 'string' && typeof o.text === 'string' && typeof o.createdAt === 'string') {
      return o;
    }
  } catch {
    /* ignore bad line */
  }
  return null;
}

export async function loadAllEntries(): Promise<MemoryEntry[]> {
  const p = getMemoryStorePath();
  try {
    const raw = await readFile(p, 'utf8');
    const out: MemoryEntry[] = [];
    for (const line of raw.split('\n')) {
      const e = parseLine(line);
      if (e) out.push(e);
    }
    return out;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'ENOENT') return [];
    throw e;
  }
}

export async function appendEntry(text: string, tags?: string[]): Promise<MemoryEntry> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('memory text is empty');

  const p = getMemoryStorePath();
  await ensureDir(p);

  const entry: MemoryEntry = {
    id: randomUUID(),
    text: trimmed,
    tags: tags?.length ? tags.map((t) => t.trim()).filter(Boolean) : undefined,
    createdAt: new Date().toISOString(),
  };

  const line = `${JSON.stringify(entry)}\n`;
  await appendFile(p, line, 'utf8');
  return entry;
}

/** 중복 방지용 해시 (같은 문단 재저장 시 스킵할 때 사용 가능) */
export function hashText(text: string): string {
  return createHash('sha256').update(text.trim(), 'utf8').digest('hex');
}

/** 전체 덮어쓰기 — 내보내기/정리용 */
export async function writeAllEntries(entries: MemoryEntry[]): Promise<void> {
  const p = getMemoryStorePath();
  await ensureDir(p);
  const body = entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : '');
  await writeFile(p, body, 'utf8');
}
