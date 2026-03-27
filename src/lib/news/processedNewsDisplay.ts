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

  return { title, summary_text };
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
