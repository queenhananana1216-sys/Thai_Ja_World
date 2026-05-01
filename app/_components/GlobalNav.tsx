import Link from 'next/link';
import AuthBar from './AuthBar';

const WRITE_HREF = '/community/write';

const NAV_MENUS: { href: string; label: string }[] = [
  { href: '/', label: '홈' },
  { href: '/community/boards', label: '광장' },
  { href: '/community/boards?cat=flea', label: '번개장터' },
  { href: '/community/boards?cat=job', label: '구인구직' },
  { href: '/local/info', label: '부동산' },
  { href: '/local', label: '로컬' },
  { href: '/news', label: '뉴스' },
];

/** RSC 순수 헤더 — 클라이언트 훅·i18n 없음 (한국어 고정 마크업) */
export default function GlobalNav() {
  return (
    <div className="sticky top-0 z-50 w-full shrink-0 border-b border-white/10 bg-[#0B0F19]">
      <div className="site-container flex flex-wrap items-center justify-between gap-3 py-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 no-underline"
          aria-label="태자월드 홈"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-400/35 bg-gradient-to-br from-violet-600/40 to-slate-900 text-lg font-black text-white shadow-inner md:h-11 md:w-11"
            aria-hidden
          >
            태
          </span>
          <span className="text-base font-black tracking-tight text-white md:text-lg">
            태자<span className="text-amber-300">월드</span>
          </span>
          <span className="sr-only">태자월드</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <div className="order-3 w-full min-w-0 max-w-xl flex-1 md:order-none md:w-auto md:max-w-md">
            <div className="w-full min-w-0">
              <label className="sr-only" htmlFor="tj-header-search-rsc">
                통합 검색
              </label>
              <form action="/search" method="GET" className="m-0">
                <input
                  id="tj-header-search-rsc"
                  name="q"
                  type="search"
                  placeholder="검색어를 입력하세요"
                  autoComplete="off"
                  className="w-full rounded-full border border-white/15 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                />
              </form>
              <p className="mt-1 text-center text-[10px] text-slate-600 md:text-left">
                메뉴·뉴스·게시판을 통합 검색합니다
              </p>
            </div>
          </div>
          <AuthBar />
        </div>
      </div>

      <nav
        className="border-t border-white/5 bg-gradient-to-b from-slate-950/90 to-slate-900/95 py-2"
        aria-label="주요 메뉴"
      >
        <div className="site-container flex flex-col gap-2">
          <details className="group md:hidden">
            <summary className="cursor-pointer list-none rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="after:ml-2 after:text-slate-500 after:content-['▾']">메뉴</span>
            </summary>
            <div className="mt-2 flex flex-col gap-1 rounded-lg border border-white/10 bg-slate-950/95 p-2">
              <a
                href="/auth/login"
                className="rounded-md border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-center text-sm font-semibold text-violet-100 no-underline"
              >
                로그인
              </a>
              <a
                href="/auth/signup"
                className="rounded-md border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-center text-sm font-semibold text-pink-100 no-underline"
              >
                회원가입
              </a>
              <Link
                href={WRITE_HREF}
                className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white no-underline"
              >
                ✎ 글 올리기
              </Link>
              {NAV_MENUS.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="rounded-md px-3 py-2 text-sm text-slate-200 no-underline hover:bg-slate-800"
                >
                  {m.label}
                </Link>
              ))}
            </div>
          </details>

          <div className="hidden flex-wrap items-center gap-2 md:flex">
            {NAV_MENUS.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-200 no-underline hover:border-amber-400/40 hover:text-amber-200"
              >
                {m.label}
              </Link>
            ))}
            <Link
              href={WRITE_HREF}
              className="ml-auto rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white no-underline shadow-md hover:bg-blue-500"
            >
              ✎ 글 올리기
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
