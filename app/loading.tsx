/**
 * 홈 등 동적 세그먼트 페치 중 순수 검은 화면처럼 보이지 않도록 최소 브랜드 로더.
 */
export default function AppLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-base font-black tracking-tight text-white">
        태자<span className="text-amber-300">월드</span>
      </p>
      <p className="text-xs font-medium text-slate-400">화면을 불러오는 중입니다…</p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-amber-400/80" />
      </div>
    </div>
  );
}
