/**
 * 홈 등 동적 세그먼트 페치 중 순수 검은 화면처럼 보이지 않도록 최소 브랜드 로더.
 * (`GlobalNav`와 동일한 «태국에, 살자» + 🐘 — 레이아웃 폰트 변수 상속)
 */
export default function AppLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="flex items-center gap-2.5 text-base font-black tracking-tight text-white">
        <span className="select-none text-[2rem] leading-none drop-shadow-[0_2px_14px_rgba(251,191,36,0.45)]" aria-hidden>
          🐘
        </span>
        <span className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-slate-900/85 via-slate-900/55 to-amber-950/35 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <span
            className="bg-gradient-to-r from-amber-50 via-amber-300 to-yellow-200 bg-clip-text text-[1.05rem] font-extrabold tracking-tight text-transparent"
            style={{ fontFamily: 'var(--tj-brand-nunito), var(--font-noto-kr), system-ui, sans-serif' }}
          >
            태국에, 살자
          </span>
        </span>
      </p>
      <p className="text-xs font-medium text-slate-400">화면을 불러오는 중입니다…</p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-amber-400/80" />
      </div>
    </div>
  );
}
