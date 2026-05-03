import { SITE_ROUTE_LOADING_PULSE } from '../_components/siteRouteLoadingPulse';

/**
 * /local/* — 로컬 허브·상세 진입 시 카드 그리드형 스켈레톤.
 */
export default function LocalLoading() {
  const b = SITE_ROUTE_LOADING_PULSE;
  return (
    <div className="site-container min-h-[min(68vh,680px)] px-4 py-6" role="status" aria-live="polite">
      <p className="sr-only">로컬 가게 정보를 불러오는 중입니다.</p>
      <div className={`${b} mb-2 h-8 w-40 max-w-[90%]`} />
      <div className={`${b} mb-8 h-4 w-72 max-w-[95%]`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={`sk-l-${i}`} className={`${b} flex min-h-44 flex-col gap-3 p-4`}>
            <div className="h-28 w-full rounded-lg bg-white/[0.07] ring-1 ring-white/5" />
            <div className="h-3.5 w-[85%] max-w-56 rounded-md bg-white/8" />
            <div className="h-3 w-[62%] max-w-48 rounded-md bg-white/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
