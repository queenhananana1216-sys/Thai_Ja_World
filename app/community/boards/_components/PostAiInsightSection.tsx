import portalStyles from '@app/portal/portal-2026.module.css';
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

/**
 * 뉴스 상세(`app/news/[id]/page.tsx`)의 위트 블록(glassGold) + 인사이트 카드(glassBlue)와 동일 리듬.
 */
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
    <section className="mt-8" aria-labelledby="post-ai-insight-heading">
      <p id="post-ai-insight-heading" className="m-0 mb-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {labels.aiInsightBlockTitle}
      </p>

      {sum ? (
        <div className={`${portalStyles.glassGold} mb-6 p-4 sm:p-5`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100/90">
            {labels.aiInsightSummaryLabel}
          </p>
          <p className="m-0 text-base leading-[1.75] tracking-[0.01em] text-slate-100 whitespace-pre-wrap wrap-break-word">
            {sum}
          </p>
        </div>
      ) : null}

      {fw ? (
        <p className="mb-4 rounded-lg border border-rose-400/30 bg-rose-950/30 px-3 py-2 text-xs font-medium text-rose-50">
          {fw}
        </p>
      ) : null}

      {imp || cnt ? (
        <div className={`${portalStyles.glassBlue} p-4 sm:p-6`}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-sky-200">
              {[labels.aiInsightImpactLabel, labels.aiInsightCounterLabel].join(' · ')}
            </p>
            {urgent ? (
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-100 ring-1 ring-rose-400/40">
                {att === 'high' ? 'HIGH' : 'ELEVATED'}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-100 ring-1 ring-emerald-400/30">
                AI
              </span>
            )}
          </div>
          {imp ? (
            <div className="mb-5">
              <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">
                {labels.aiInsightImpactLabel}
              </p>
              <p className="m-0 text-base leading-[1.85] text-slate-100 whitespace-pre-wrap wrap-break-word">
                {imp}
              </p>
            </div>
          ) : null}
          {cnt ? (
            <div>
              <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">
                {labels.aiInsightCounterLabel}
              </p>
              <p className="m-0 text-base leading-[1.85] text-slate-100 whitespace-pre-wrap wrap-break-word">
                {cnt}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
