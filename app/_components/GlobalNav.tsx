import Link from 'next/link';
import type { Dictionary } from '@/i18n/dictionaries';
import AuthBar from './AuthBar';

const STATIC_MENUS = [
  { href: '/', label: '홈' },
  { href: '/community/boards', label: '자유게시판' },
  { href: '/community/boards?cat=flea', label: '번개장터' },
  { href: '/community/boards?cat=job', label: '구인구직' },
  { href: '/local/info', label: '부동산' },
  { href: '/local', label: '로컬예약' },
] as const;

const WRITE_HREF = '/community/write';

type Props = {
  dict: Pick<Dictionary, 'nav' | 'brandSuffix' | 'logoAria' | 'lang' | 'search'>;
};

/**
 * 2026 비상 정적 헤더 — DB·Supabase·useEffect·인증 분기 없음. 시각적 껍데기만.
 */
export default function GlobalNav({ dict }: Props) {
  return (
    <div className="sticky top-0 z-50 w-full shrink-0 border-b border-white/10 bg-[#0B0F19]">
      <div className="border-b border-white/5 bg-slate-950/80">
        <div className="site-container flex flex-wrap items-center justify-between gap-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
            <span className="rounded border border-white/10 px-1.5 py-0.5 text-slate-400">{dict.lang.ko}</span>
            <span className="text-slate-600">/</span>
            <span className="rounded border border-white/10 px-1.5 py-0.5 text-slate-400">{dict.lang.th}</span>
          </div>
          <AuthBar />
        </div>
      </div>

      <div className="site-container flex flex-wrap items-center justify-between gap-3 py-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 no-underline"
          aria-label={dict.logoAria}
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
          <span className="sr-only">{dict.brandSuffix}</span>
        </Link>

        <div className="order-3 w-full min-w-0 max-w-xl flex-1 md:order-none md:w-auto md:max-w-md">
          <label className="sr-only" htmlFor="tj-header-search-dumb">
            {dict.search.ariaLabel}
          </label>
          <input
            id="tj-header-search-dumb"
            type="search"
            name="tj-header-search-dumb"
            readOnly
            tabIndex={-1}
            placeholder={dict.search.placeholder}
            className="w-full rounded-full border border-white/15 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 outline-none ring-0 placeholder:text-slate-500"
          />
          <p className="mt-1 text-center text-[10px] text-slate-600 md:text-left">{dict.search.headerBarLabel}</p>
        </div>
      </div>

      <nav
        className="border-t border-white/5 bg-gradient-to-b from-slate-950/90 to-slate-900/95 py-2"
        aria-label={dict.nav.mainNavAria}
      >
        <div className="site-container flex flex-col gap-2">
          <details className="group md:hidden">
            <summary className="cursor-pointer list-none rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="after:ml-2 after:text-slate-500 after:content-['▾']">메뉴</span>
            </summary>
            <div className="mt-2 flex flex-col gap-1 rounded-lg border border-white/10 bg-slate-950/95 p-2">
              <Link
                href="/auth/login?next=%2F"
                className="rounded-md border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-center text-sm font-semibold text-violet-100 no-underline"
              >
                로그인
              </Link>
              <Link
                href="/auth/signup?next=%2F"
                className="rounded-md border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-center text-sm font-semibold text-pink-100 no-underline"
              >
                회원가입
              </Link>
              <Link
                href={WRITE_HREF}
                className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white no-underline"
              >
                ✎ 글쓰기
              </Link>
              {STATIC_MENUS.map((m) => (
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
            {STATIC_MENUS.map((m) => (
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
              ✎ 글쓰기
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
