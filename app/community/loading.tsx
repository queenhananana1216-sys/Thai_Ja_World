import { TAEJA_ROUTE_LOADING_PULSE } from '../_components/taejaRouteLoadingPulse';

/**
 * /community/* 네비게이션 직후 — 광장·보드형 목록 체감에 맞춘 중앙 피드 스켈레톤.
 */
export default function CommunityLoading() {
  const b = TAEJA_ROUTE_LOADING_PULSE;
  return (
    <div className="site-container min-h-[min(68vh,680px)] px-4 py-5" role="status" aria-live="polite">
      <p className="sr-only">커뮤니티 콘텐츠를 불러오는 중입니다.</p>
      <div className={`${b} mb-4 h-14 w-full max-w-3xl`} />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-2.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`sk-c-${i}`} className={`${b} h-13 w-full`} />
          ))}
        </div>
        <aside className="hidden w-full shrink-0 flex-col gap-3 lg:flex lg:w-68">
          <div className={`${b} h-36 w-full`} />
          <div className={`${b} h-28 w-full`} />
          <div className={`${b} h-24 w-full`} />
        </aside>
      </div>
    </div>
  );
}
