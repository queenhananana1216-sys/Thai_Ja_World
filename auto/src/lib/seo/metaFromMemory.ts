import 'server-only';

import { askLocalAi } from '@/lib/ai/localOllama';
import type { MemoryEntry } from '@/lib/memory/types';
import { searchMemory } from '@/lib/memory/search';
import { isPipelineLocalOnly } from '@/lib/pipeline/localMode';

export type MetaDraftFromMemoryInput = {
  path: string;
  locale?: string;
  /** 메모리 검색어 보강 (선택) */
  memoryQuery?: string;
  memoryLimit?: number;
};

export type MetaDraftFromMemoryResult = {
  title: string;
  description: string;
  note: string;
  memoryIds?: string[];
};

function pathToQuery(path: string): string {
  const s = path.replace(/\//g, ' ').replace(/-/g, ' ').trim();
  return s || 'home';
}

/** 명시적으로 로컬 AI 메타 초안 끔 — `SEO_META_USE_LOCAL_AI=0` */
function useLocalAiForMeta(): boolean {
  return process.env.SEO_META_USE_LOCAL_AI?.trim() !== '0';
}

function parseMetaJson(raw: string): { title?: string; description?: string } | null {
  const cleaned = raw.replace(/^```json\s*|\s*```$/gm, '').trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  try {
    const o = JSON.parse(m ? m[0] : cleaned) as { title?: string; description?: string };
    return o;
  } catch {
    return null;
  }
}

function fallbackFromHits(path: string, hits: MemoryEntry[]): MetaDraftFromMemoryResult {
  const titleBase = hits[0]?.text?.replace(/\s+/g, ' ').trim().slice(0, 48) ?? '';
  const title = titleBase
    ? `${titleBase}${titleBase.length >= 48 ? '…' : ''} | ${path}`
    : `태자 월드 — ${path}`;

  const descParts = hits
    .slice(0, 4)
    .map((h) => h.text.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  let description = descParts.join(' · ');
  if (description.length > 158) description = `${description.slice(0, 155)}…`;

  return {
    title: title.slice(0, 72),
    description: description.slice(0, 165),
    note:
      '규칙 기반 초안(외장 메모리 조각만 사용). 배포 전 태자 i18n·브랜드 규칙으로 반드시 검수·치환.',
    memoryIds: hits.map((h) => h.id),
  };
}

async function tryLocalAiMeta(
  path: string,
  locale: string | undefined,
  hits: MemoryEntry[],
): Promise<MetaDraftFromMemoryResult | null> {
  const system = `응답은 JSON 한 객체뿐이다: {"title":"...","description":"..."}
title은 공백 포함 58자 이내, description은 158자 이내, 한국어.
외장 메모리에 없는 사실은 쓰지 마라. 추측 금지.`;

  const ctx = hits.map((h, i) => `[${i + 1}] ${h.text}`).join('\n');
  const prompt = `페이지 경로: ${path}
로케일 힌트: ${locale ?? 'ko'}

외장 메모리 조각(유일한 근거):
${ctx || '(없음)'}

위만 근거로 이 경로용 title·description 초안을 JSON으로.`;

  try {
    const raw = await askLocalAi({ system, prompt });
    const o = parseMetaJson(raw);
    if (typeof o?.title === 'string' && typeof o?.description === 'string') {
      return {
        title: o.title.trim().slice(0, 70),
        description: o.description.trim().slice(0, 165),
        note:
          '로컬 AI(Ollama) 초안 — 사실·브랜드는 사람이 검수 후 dictionaries·site 메타에 반영.',
        memoryIds: hits.map((h) => h.id),
      };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * 파이프라인 `seo.metaDraft` — 외장 메모리만 근거로 메타 초안.
 * - 메모 0건: 스텁 안내
 * - AUTO_PIPELINE_LOCAL_ONLY=1 또는 SEO_META_USE_LOCAL_AI=0: 규칙 기안만
 * - 그 외: 로컬 AI 시도 → 실패 시 규칙 기안
 */
export async function draftMetaFromMemory(
  input: MetaDraftFromMemoryInput,
): Promise<MetaDraftFromMemoryResult> {
  const path = (input.path || '/').trim() || '/';
  const q = [pathToQuery(path), input.memoryQuery?.trim()].filter(Boolean).join(' ');
  const limit = Math.min(20, Math.max(1, input.memoryLimit ?? 8));

  const hits = await searchMemory(q, limit);

  if (hits.length === 0) {
    return {
      title: `태자 월드 — ${path}`,
      description: `이 경로와 관련된 메모가 외장 메모리에 없습니다. 로컬에서 npm run memory -- add 로 메모를 쌓은 뒤 다시 실행하세요.`,
      note: '외장 메모리 0건 — 스텁만. 배포 금지 아님, 내용 보강 권장.',
    };
  }

  const localOnly = isPipelineLocalOnly();
  const allowAi = useLocalAiForMeta() && !localOnly;

  if (!allowAi) {
    return fallbackFromHits(path, hits);
  }

  const ai = await tryLocalAiMeta(path, input.locale, hits);
  if (ai) return ai;

  return fallbackFromHits(path, hits);
}
