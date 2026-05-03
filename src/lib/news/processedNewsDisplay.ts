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
  /** 교민·거주자에게 미치는 영향(인사이트) — 신규 파이프라인 */
  insight_impact?: string;
  /** 구체적 행동 지침 — 신규 파이프라인 */
  countermeasure?: string;
};

export type NewsIncidentAttention = 'none' | 'elevated' | 'high';

export type ParsedCleanBodyAiSignals = {
  incident_attention?: NewsIncidentAttention;
  feed_warning_ko?: string;
  feed_warning_th?: string;
};

export type ParsedCleanBody = {
  ko?: LangBlock;
  th?: LangBlock;
  source_url?: string;
  /** 목록 뱃지·경고 문구 — 신규 파이프라인 */
  ai_signals?: ParsedCleanBodyAiSignals;
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

/** 홈·포털 목록: 가공되지 않은 영문 헤드라인(원문 RSS 톤) 노출 방지 */
function isMostlyAsciiNewsHeadline(s: string): boolean {
  const t = s.trim();
  if (t.length < 14) return false;
  let ascii = 0;
  let latinLetters = 0;
  for (const ch of t) {
    if (/[A-Za-z]/.test(ch)) {
      latinLetters += 1;
      ascii += 1;
    } else if (ch <= '~') ascii += 1;
  }
  return latinLetters >= 12 && ascii / Math.max(t.length, 1) > 0.72;
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

export type TitleSummaryFromProcessedOptions = {
  /** false 이면 raw_news.title(영문 원문) 폴백을 쓰지 않음 — 공개 화면 전용 */
  allowRawTitleFallback?: boolean;
};

export function titleAndSummaryFromProcessed(
  cleanBody: string | null | undefined,
  rawTitle: string | null | undefined,
  summaries:
    | { summary_text: string; model?: string | null }[]
    | null
    | undefined,
  locale: Locale = 'ko',
  options?: TitleSummaryFromProcessedOptions,
): { title: string; summary_text: string | null } {
  const allowRaw = options?.allowRawTitleFallback !== false;
  const { ko, th } = parseCleanBodyFull(cleanBody);

  const primary = locale === 'th' ? th : ko;
  const fallback = locale === 'th' ? ko : th;

  const title =
    nonEmpty(primary?.title) ||
    nonEmpty(fallback?.title) ||
    (allowRaw ? rawTitle?.trim() : null) ||
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

  const titleDisplay = humanizeNewsTitle(
    title,
    summary_text,
    allowRaw ? rawTitle : null,
    locale,
  );

  return { title: titleDisplay, summary_text };
}

/**
 * 목록용: `processed_news`만 사용 — `raw_news.title`(영문 원문)은 절대 쓰지 않음.
 * clean_body(ko/th) + summaries 만으로 제목·요약을 만들고, 부족하면 행 자체를 버림(null).
 */
export function listTitleSummaryFromProcessedNoRaw(
  cleanBody: string | null | undefined,
  summaries:
    | { summary_text: string; model?: string | null }[]
    | null
    | undefined,
  locale: Locale = 'ko',
): { title: string; summary_text: string | null } | null {
  const { ko, th } = parseCleanBodyFull(cleanBody);
  const primary = locale === 'th' ? th : ko;
  const fallback = locale === 'th' ? ko : th;

  const fromCleanSummary =
    nonEmpty(primary?.summary) || nonEmpty(fallback?.summary) || null;
  const koRow = summaries?.find((s) => s.model === 'ko')?.summary_text?.trim();
  const thRow = summaries?.find((s) => s.model === 'th')?.summary_text?.trim();
  const summaryFromTable = locale === 'th' ? thRow || koRow : koRow || thRow;
  const anyFirst = summaries?.[0]?.summary_text?.trim();
  const summary_text = fromCleanSummary || summaryFromTable || anyFirst || null;

  let title = nonEmpty(primary?.title) || nonEmpty(fallback?.title) || null;
  if (title && looksRoboticOrInternalNewsTitle(title)) title = null;
  if (title && locale === 'ko' && isMostlyAsciiNewsHeadline(title)) {
    title = titleFromSummaryFirstLine(summary_text, 200);
  }

  if (!title && summary_text) {
    title = titleFromSummaryFirstLine(summary_text, 200);
  }
  if (!title?.trim()) return null;

  const finalTitle = humanizeNewsTitle(title, summary_text, null, locale);
  if (!finalTitle.trim() || finalTitle === '(제목 없음)') return null;
  if (locale === 'ko' && isMostlyAsciiNewsHeadline(finalTitle)) return null;

  return { title: clampTitle(finalTitle, 200), summary_text };
}

/**
 * 공개 노출: DB `language`(요구사항의 language_code 와 동일 역할)가 `ko`가 아니면 제외.
 * `language` 가 null 인 레거시 행은 한글 제목·요약이 검증될 때만 통과.
 */
export function passesKoPublicGate(
  language: string | null | undefined,
  cleanBody: string | null | undefined,
  summaries:
    | { summary_text: string; model?: string | null }[]
    | null
    | undefined,
): boolean {
  const lang = (language ?? '').trim().toLowerCase();
  if (lang && lang !== 'ko') return false;
  return listTitleSummaryFromProcessedNoRaw(cleanBody, summaries, 'ko') !== null;
}

export type NewsDetailParts = {
  title: string;
  summary: string | null;
  /** 짧은 위트 톤(없으면 요약 앞부분으로 대체) */
  blurb: string | null;
  /** 요약 뒤에 붙는 편집실 톤(선택) */
  editorNote: string | null;
  sourceUrl: string | null;
  /** 이용자 영향 분석(로케일 우선) */
  insightImpact: string | null;
  /** 행동 지침(로케일 우선) */
  countermeasure: string | null;
  incidentAttention: NewsIncidentAttention;
};

function parseIncidentAttention(raw: unknown): NewsIncidentAttention {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (s === 'high' || s === 'elevated' || s === 'none') return s;
  return 'none';
}

export function newsDetailFromProcessed(
  cleanBody: string | null | undefined,
  rawTitle: string | null | undefined,
  rawExternalUrl: string | null | undefined,
  summaries:
    | { summary_text: string; model?: string | null }[]
    | null
    | undefined,
  locale: Locale,
  options?: TitleSummaryFromProcessedOptions,
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
    options,
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

  const insightRaw =
    nonEmpty(primary?.insight_impact) ||
    nonEmpty(fallback?.insight_impact) ||
    null;
  const counterRaw =
    nonEmpty(primary?.countermeasure) ||
    nonEmpty(fallback?.countermeasure) ||
    null;
  const incidentAttention = parseIncidentAttention(parsed.ai_signals?.incident_attention);

  return {
    title: base.title,
    summary: base.summary_text,
    blurb,
    editorNote: editorRaw,
    sourceUrl,
    insightImpact: insightRaw,
    countermeasure: counterRaw,
    incidentAttention,
  };
}

/** 포털·홈 뉴스 줄 — `clean_body`에서 배지·경고용 신호만 추출 */
export function newsFeedSignalsFromCleanBody(
  cleanBody: string | null | undefined,
  locale: Locale,
): {
  hasCountermeasure: boolean;
  incidentAttention: NewsIncidentAttention;
  feedWarning: string | null;
} {
  const parsed = parseCleanBodyFull(cleanBody);
  const ko = parsed.ko;
  const th = parsed.th;
  const primary = locale === 'th' ? th : ko;
  const fallback = locale === 'th' ? ko : th;
  const counter =
    nonEmpty(primary?.countermeasure) ||
    nonEmpty(fallback?.countermeasure) ||
    null;
  const incidentAttention = parseIncidentAttention(parsed.ai_signals?.incident_attention);
  const fwKo =
    typeof parsed.ai_signals?.feed_warning_ko === 'string'
      ? parsed.ai_signals.feed_warning_ko.trim()
      : '';
  const fwTh =
    typeof parsed.ai_signals?.feed_warning_th === 'string'
      ? parsed.ai_signals.feed_warning_th.trim()
      : '';
  const feedWarning =
    locale === 'th'
      ? fwTh || fwKo || null
      : fwKo || fwTh || null;
  return {
    hasCountermeasure: Boolean(counter?.trim()),
    incidentAttention,
    feedWarning: feedWarning || null,
  };
}
