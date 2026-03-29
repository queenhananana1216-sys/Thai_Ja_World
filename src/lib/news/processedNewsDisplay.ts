/**
 * processed_news.clean_body(JSON) + summaries 폴백 — 목록·상세 공통
 */

import type { Locale } from '@/i18n/types';

export type LangBlock = {
  title?: string;
  summary?: string;
  blurb?: string;
  /** 편집실 한마디(요약 아래 표시). 구 기사에는 없을 수 있음 */
  editor_note?: string;
};

export type ParsedCleanBody = {
  ko?: LangBlock;
  th?: LangBlock;
  source_url?: string;
};

function parseCleanBodyFull(cleanBody: string | null | undefined): ParsedCleanBody {
  if (!cleanBody?.trim()) return {};
  try {
    const o = JSON.parse(cleanBody) as ParsedCleanBody;
    if (!o || typeof o !== 'object') return {};
    return o;
  } catch {
    return {};
  }
}

function nonEmpty(s: string | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

function blurbFallbackFromSummary(summary: string | null): string | null {
  if (!summary?.trim()) return null;
  const t = summary.trim();
  const cut = t.length > 140 ? `${t.slice(0, 137).trim()}…` : t;
  return cut;
}

/** LLM/초안이 프롬프트 문구를 제목으로 복사한 경우 등 — 사용자에게는 자연스러운 제목으로 */
function looksRoboticOrInternalNewsTitle(t: string): boolean {
  const s = t.trim();
  if (!s) return false;
  if (s.includes('메타데이터')) return true;
  if (/뉴스\s*기사\s*메타/i.test(s)) return true;
  if (/기사\s*메타/i.test(s)) return true;
  if (/metadata/i.test(s) && /news|article|기사/i.test(s)) return true;
  return false;
}

function clampTitle(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function titleFromSummaryFirstLine(summary: string | null, max: number): string | null {
  if (!summary?.trim()) return null;
  const line = summary
    .trim()
    .split(/\n/)
    .map((x) => x.trim())
    .find((x) => x.length >= 12);
  if (!line) return null;
  const cleaned = line.replace(/^[\s\-—·]+/, '').replace(/\s+/g, ' ');
  if (looksRoboticOrInternalNewsTitle(cleaned)) return null;
  return clampTitle(cleaned, max);
}

function humanizeNewsTitle(
  title: string,
  summary: string | null,
  rawTitle: string | null | undefined,
  locale: Locale,
): string {
  if (!looksRoboticOrInternalNewsTitle(title)) return title;
  const rt = rawTitle?.trim();
  if (rt && !looksRoboticOrInternalNewsTitle(rt)) return clampTitle(rt, 200);
  const fromSum = titleFromSummaryFirstLine(summary, 200);
  if (fromSum) return fromSum;
  return locale === 'th' ? 'สรุปข่าวล่าสุด' : '태국·동남아 소식 한 줄';
}

export function titleAndSummaryFromProcessed(
  cleanBody: string | null | undefined,
  rawTitle: string | null | undefined,
  summaries:
    | { summary_text: string; model?: string | null }[]
    | null
    | undefined,
  locale: Locale = 'ko',
): { title: string; summary_text: string | null } {
  const { ko, th } = parseCleanBodyFull(cleanBody);

  const primary = locale === 'th' ? th : ko;
  const fallback = locale === 'th' ? ko : th;

  const title =
    nonEmpty(primary?.title) ||
    nonEmpty(fallback?.title) ||
    rawTitle?.trim() ||
    '(제목 없음)';

  const fromClean =
    nonEmpty(primary?.summary) || nonEmpty(fallback?.summary) || null;

  const koRow = summaries?.find((s) => s.model === 'ko')?.summary_text?.trim();
  const thRow = summaries?.find((s) => s.model === 'th')?.summary_text?.trim();
  const summaryFromTable =
    locale === 'th' ? thRow || koRow : koRow || thRow;
  const anyFirst = summaries?.[0]?.summary_text?.trim();

  const summary_text =
    fromClean || summaryFromTable || anyFirst || null;

  const titleDisplay = humanizeNewsTitle(title, summary_text, rawTitle, locale);

  return { title: titleDisplay, summary_text };
}

export type NewsDetailParts = {
  title: string;
  summary: string | null;
  /** 짧은 위트 톤(없으면 요약 앞부분으로 대체) */
  blurb: string | null;
  /** 요약 뒤에 붙는 편집실 톤(선택) */
  editorNote: string | null;
  sourceUrl: string | null;
};

export function newsDetailFromProcessed(
  cleanBody: string | null | undefined,
  rawTitle: string | null | undefined,
  rawExternalUrl: string | null | undefined,
  summaries:
    | { summary_text: string; model?: string | null }[]
    | null
    | undefined,
  locale: Locale,
): NewsDetailParts {
  const parsed = parseCleanBodyFull(cleanBody);
  const ko = parsed.ko;
  const th = parsed.th;
  const primary = locale === 'th' ? th : ko;
  const fallback = locale === 'th' ? ko : th;

  const base = titleAndSummaryFromProcessed(
    cleanBody,
    rawTitle,
    summaries,
    locale,
  );

  const blurbRaw =
    nonEmpty(primary?.blurb) ||
    nonEmpty(fallback?.blurb) ||
    null;

  const blurb = blurbRaw || blurbFallbackFromSummary(base.summary_text);

  const editorRaw =
    nonEmpty(primary?.editor_note) ||
    nonEmpty(fallback?.editor_note) ||
    null;

  const sourceUrl =
    (typeof parsed.source_url === 'string' && parsed.source_url.trim()) ||
    rawExternalUrl?.trim() ||
    null;

  return {
    title: base.title,
    summary: base.summary_text,
    blurb,
    editorNote: editorRaw,
    sourceUrl,
  };
}
