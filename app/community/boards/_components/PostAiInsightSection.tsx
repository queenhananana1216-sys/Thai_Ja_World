import { parsePostAiInsightV1 } from '@/lib/community/postAiInsightDisplay';
import type { Locale } from '@/i18n/types';

type BoardAiLabels = {
  aiInsightBlockTitle: string;
  aiInsightSummaryLabel: string;
  aiInsightImpactLabel: string;
  aiInsightCounterLabel: string;
};

type Props = {
  aiInsight: unknown;
  locale: Locale;
  labels: BoardAiLabels;
};

export default function PostAiInsightSection({ aiInsight, locale, labels }: Props) {
  const parsed = parsePostAiInsightV1(aiInsight);
  if (!parsed) return null;
  const lang = locale === 'th' ? 'th' : 'ko';
  const block = parsed.display[lang] ?? parsed.display.ko;
  if (!block) return null;
  const sum = block.summary?.trim();
  const imp = block.insight_impact?.trim();
  const cnt = block.countermeasure?.trim();
  if (!sum && !imp && !cnt) return null;

  const att = (parsed.display.ai_signals?.incident_attention ?? 'none').toLowerCase();
  const urgent = att === 'elevated' || att === 'high';
  const fw =
    lang === 'th'
      ? (parsed.display.ai_signals?.feed_warning_th ?? '').trim()
      : (parsed.display.ai_signals?.feed_warning_ko ?? '').trim();

  return (
    <section
      className="mt-6 rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-950/50 to-slate-950/60 p-4 shadow-[0_12px_36px_rgba(76,29,149,0.18)] sm:p-5"
      aria-labelledby="post-ai-insight-heading"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="post-ai-insight-heading" className="m-0 text-sm font-extrabold tracking-tight text-violet-100">
          {labels.aiInsightBlockTitle}
        </h2>
        {urgent ? (
          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-100 ring-1 ring-rose-400/40">
            🚨 {att === 'high' ? 'HIGH' : 'ELEVATED'}
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-100 ring-1 ring-emerald-400/30">
            AI
          </span>
        )}
      </div>
      {fw ? (
        <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-950/30 px-3 py-2 text-xs font-medium text-rose-50">
          {fw}
        </p>
      ) : null}
      <dl className="mt-3 space-y-3 text-sm">
        {sum ? (
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-violet-200/90">
              {labels.aiInsightSummaryLabel}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-100 leading-relaxed">{sum}</dd>
          </div>
        ) : null}
        {imp ? (
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-violet-200/90">
              {labels.aiInsightImpactLabel}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-200 leading-relaxed">{imp}</dd>
          </div>
        ) : null}
        {cnt ? (
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-violet-200/90">
              {labels.aiInsightCounterLabel}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-200 leading-relaxed">{cnt}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
