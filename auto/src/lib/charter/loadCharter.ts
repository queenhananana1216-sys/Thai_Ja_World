import 'server-only';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MAX = 120_000;

function defaultCharterPath(): string {
  const override = process.env.LLANGKKA_CHARTER_PATH?.trim();
  if (override) return override;
  return join(process.cwd(), 'PIPELINE_CHARTER.md');
}

/** 강령 전문(로컬 파일만 — 네트워크 없음) */
export function loadPipelineCharter(): { path: string; text: string; found: boolean } {
  const path = defaultCharterPath();
  try {
    if (!existsSync(path)) {
      return { path, text: '', found: false };
    }
    const raw = readFileSync(path, 'utf8');
    const text = raw.length > MAX ? `${raw.slice(0, MAX)}\n\n…(truncated)` : raw;
    return { path, text, found: true };
  } catch {
    return { path, text: '', found: false };
  }
}

/** 프리뷰·관리 UI용 */
export function getCharterPreview(maxChars = 800): string {
  const { text } = loadPipelineCharter();
  if (!text) return '(강령 파일 없음 — PIPELINE_CHARTER.md 를 추가하세요)';
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}
