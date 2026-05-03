import { SITE_ROUTE_LOADING_PULSE } from './_components/siteRouteLoadingPulse';

/**
 * 루트 페이지 세그먼트 SSR 대기 중 — 네비는 레이아웃에 고정, 본문만 즉시 스켈레톤 전환.
 */
export default function Loading() {
  const b = SITE_ROUTE_LOADING_PULSE;
  return (
    <div className="site-container min-h-[min(72vh,720px)] px-4 py-6" role="status" aria-live="polite">
      <p className="sr-only">태국에, 살자 포털을 불러오는 중입니다.</p>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
        <aside className="hidden min-w-0 shrink-0 flex-col gap-3 min-[1181px]:flex min-[1181px]:w-54">
          <div className={`${b} h-24 w-full`} />
          <div className={`${b} h-36 w-full`} />
          <div className={`${b} h-28 w-full`} />
        </aside>
        <div className="min-w-0 flex-1 space-y-4">
          <div className={`${b} h-12 w-[min(100%,22rem)]`} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`sk-p-${i}`} className={`${b} min-h-36 w-full`} />
            ))}
          </div>
          <div className={`${b} min-h-48 w-full`} />
        </div>
        <aside className="hidden min-w-0 shrink-0 flex-col gap-3 min-[1181px]:flex min-[1181px]:w-54">
          <div className={`${b} h-32 w-full`} />
          <div className={`${b} h-40 w-full`} />
        </aside>
      </div>
    </div>
  );
}
