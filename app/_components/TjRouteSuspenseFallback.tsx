import { TjBrandElephantMark } from '@/components/brand/TjBrandElephantMark';

/**
 * 레이아웃·페이지 세그먼트 전환 Suspense 폴백 — 검정 무신호 화면 방지
 */
export function TjRouteSuspenseFallback() {
  return (
    <div
      className="flex min-h-[38vh] w-full flex-col items-center justify-center gap-6 px-4 py-14"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="max-w-md rounded-3xl border border-white/12 bg-white/[0.04] px-8 py-10 text-center shadow-[0_22px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="mb-6 flex justify-center">
          <TjBrandElephantMark size={56} animate="breathe" />
        </div>
        <div className="mx-auto mb-6 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-gradient-to-r from-amber-300/95 via-violet-300/90 to-cyan-300/90" />
        </div>
        <p className="m-0 text-sm font-semibold leading-relaxed text-slate-200">
          페이지 뼈대를 불러오는 중입니다…
        </p>
      </div>
    </div>
  );
}
