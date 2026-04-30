import Link from 'next/link';

/** GlobalNav 예외 시에도 동일한 정적 껍데기 */
export function GlobalNavFallback() {
  return (
    <div className="sticky top-0 z-50 w-full shrink-0 border-b border-white/10 bg-[#0B0F19]">
      <div className="site-container flex flex-wrap items-center justify-between gap-2 py-2">
        <Link href="/" className="text-sm font-black text-white no-underline">
          태자<span className="text-amber-300">월드</span>
        </Link>
        <div className="flex gap-2">
          <Link
            href="/auth/login?next=%2F"
            className="rounded-full border border-violet-400/40 px-3 py-1 text-xs font-bold text-violet-100 no-underline"
          >
            로그인
          </Link>
          <Link
            href="/auth/signup?next=%2F"
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-slate-100 no-underline"
          >
            회원가입
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 pb-2">
        <input
          readOnly
          tabIndex={-1}
          placeholder="통합 검색"
          className="w-full max-w-md rounded-full border border-white/15 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300"
        />
      </div>
    </div>
  );
}
