import { BRAND_HOME_LIVE_FEED_EMPTY_KO } from '@/lib/site-brand/constants';

type HomeGlassEmptyStateProps = {
  label?: string;
};

export function HomeGlassEmptyState({ label }: HomeGlassEmptyStateProps) {
  return (
    <div
      className="rounded-xl border border-slate-600/40 bg-slate-900/45 px-3 py-3 text-center shadow-[0_14px_30px_rgba(2,6,23,0.38)] backdrop-blur-md"
      aria-label={label ?? '빈 상태'}
    >
      <p className="m-0 text-sm font-medium leading-relaxed text-slate-200">{BRAND_HOME_LIVE_FEED_EMPTY_KO}</p>
    </div>
  );
}
