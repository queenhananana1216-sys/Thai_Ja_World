import Link from 'next/link';

/** GlobalNav 렌더 예외 시 — 비로그인 기본 헤더(정적, DB·세션 없음) */
export function GlobalNavFallback() {
  return (
    <div className="sticky top-0 z-[600] w-full shrink-0 border-b border-white/10 bg-[#0B0F19] isolate">
    <header className="global-header global-header--compact" role="banner">
      <div className="site-container global-header__toolbar-inner py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-extrabold tracking-tight text-white no-underline hover:underline">
            태자월드
          </Link>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-200">
            <Link href="/community/boards" className="no-underline hover:text-amber-200 hover:underline">
              광장
            </Link>
            <Link href="/news" className="no-underline hover:text-amber-200 hover:underline">
              뉴스
            </Link>
            <Link href="/local" className="no-underline hover:text-amber-200 hover:underline">
              로컬
            </Link>
            <Link href="/auth/login" className="no-underline hover:text-amber-200 hover:underline">
              로그인
            </Link>
          </nav>
        </div>
      </div>
    </header>
    </div>
  );
}
