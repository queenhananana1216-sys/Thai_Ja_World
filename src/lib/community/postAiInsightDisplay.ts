import type { Locale } from '@/i18n/types';
import type { NewsIncidentAttention, ParsedCleanBodyAiSignals } from '@/lib/news/processedNewsDisplay';

export type PostAiInsightDisplayBlock = {
  summary?: string;
  insight_impact?: string;
  countermeasure?: string;
};

/** posts.ai_insight / processed_knowledge.ai_insight 공통 v1 display */
export type PostAiInsightDisplayV1 = {
  ko?: PostAiInsightDisplayBlock;
  th?: PostAiInsightDisplayBlock;
  ai_signals?: ParsedCleanBodyAiSignals;
};

export type PostAiInsightV1 = {
  schema_version: 1;
  raw_llm?: Record<string, unknown>;
  display: PostAiInsightDisplayV1;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

export function parsePostAiInsightV1(insight: unknown): PostAiInsightV1 | null {
  const o = asRecord(insight);
  if (!o) return null;
  if (Number(o.schema_version) !== 1) return null;
  const display = asRecord(o.display);
  if (!display) return null;
  return {
    schema_version: 1,
    raw_llm: asRecord(o.raw_llm) ?? undefined,
    display: display as unknown as PostAiInsightDisplayV1,
  };
}

export function postAiFeedSignalsFromInsight(
  insight: unknown,
  locale: Locale,
): {
  incidentAttention: NewsIncidentAttention;
  feedWarning: string | null;
  hasInsightBlock: boolean;
} {
  const parsed = parsePostAiInsightV1(insight);
  if (!parsed) {
    return { incidentAttention: 'none', feedWarning: null, hasInsightBlock: false };
  }
  const lang = locale === 'th' ? 'th' : 'ko';
  const block = parsed.display[lang] ?? parsed.display.ko;
  const att = (parsed.display.ai_signals?.incident_attention ?? 'none').toLowerCase() as NewsIncidentAttention;
  const incidentAttention =
    att === 'elevated' || att === 'high' || att === 'none' ? att : 'none';
  const fw =
    lang === 'th'
      ? (parsed.display.ai_signals?.feed_warning_th ?? '').trim()
      : (parsed.display.ai_signals?.feed_warning_ko ?? '').trim();
  const hasText = Boolean(
    block?.summary?.trim() || block?.insight_impact?.trim() || block?.countermeasure?.trim(),
  );
  return {
    incidentAttention,
    feedWarning: fw || null,
    hasInsightBlock: hasText,
  };
}
