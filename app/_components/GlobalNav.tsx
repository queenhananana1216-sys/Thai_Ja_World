import Link from 'next/link';
import AuthBar from './AuthBar';
import { getLocale } from '@/i18n/get-locale';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/types';

const WRITE_HREF = '/community/write';

/** `nav` 키에 없는 헤더 전용 라벨 — 단계적으로 사전으로 옮길 수 있음 */
function headerExtraLabels(locale: Locale) {
  if (locale === 'th') {
    return {
      flea: 'ตลาดมือสอง',
      jobs: 'รับสมัครงาน',
      realestate: 'อสังหาฯ',
      news: 'ข่าว',
      menu: 'เมนู',
      searchPlaceholder: 'ค้นหา',
      searchHint: 'ค้นหาเมนู·ข่าว·บอร์ด',
    };
  }
  return {
    flea: '번개장터',
    jobs: '구인구직',
    realestate: '부동산',
    news: '뉴스',
    menu: '메뉴',
    searchPlaceholder: '검색어를 입력하세요',
    searchHint: '메뉴·뉴스·게시판을 통합 검색합니다',
  };
}

export default async function GlobalNav() {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const x = headerExtraLabels(locale);

  const NAV_MENUS: { href: string; label: string }[] = [
    { href: '/', label: d.nav.home },
    { href: '/boards', label: d.nav.boards },
    { href: '/community/boards', label: d.nav.community },
    { href: '/community/boards?cat=flea', label: x.flea },
    { href: '/community/boards?cat=job', label: x.jobs },
    { href: '/local/info', label: x.realestate },
    { href: '/local', label: d.nav.local },
    { href: '/news', label: x.news },
  ];

  return (
    <div className="sticky top-0 z-50 w-full shrink-0 border-b border-white/10 bg-[#0B0F19]">
      <div className="site-container flex flex-wrap items-center justify-between gap-3 py-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 no-underline"
          aria-label={d.logoAria}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-400/35 bg-gradient-to-br from-violet-600/40 to-slate-900 text-lg font-black text-white shadow-inner md:h-11 md:w-11"
            aria-hidden
          >
            태
          </span>
          <span className="text-base font-black tracking-tight text-white md:text-lg">
            태자<span className="text-amber-300">{d.brandSuffix}</span>
          </span>
          <span className="sr-only">{d.logoAria}</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-gray-200"
            aria-label={locale === 'th' ? 'ภาษา' : '언어'}
          >
            <a
              href="?lang=ko"
              className="inline-flex min-h-11 items-center rounded border border-white/15 px-2.5 text-gray-100 no-underline transition-colors hover:border-white/30 hover:text-white"
            >
              {d.lang.ko}
            </a>
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <a
              href="?lang=th"
              className="inline-flex min-h-11 items-center rounded border border-white/15 px-2.5 text-gray-100 no-underline transition-colors hover:border-white/30 hover:text-white"
            >
              {d.lang.th}
            </a>
          </div>
          <div className="order-3 w-full min-w-0 max-w-xl flex-1 md:order-none md:w-auto md:max-w-md">
            <div className="w-full min-w-0">
              <label className="sr-only" htmlFor="tj-header-search-rsc">
                {locale === 'th' ? 'ค้นหา' : '통합 검색'}
              </label>
              <form action="/search" method="GET" className="m-0">
                <input
                  id="tj-header-search-rsc"
                  name="q"
                  type="search"
                  placeholder={x.searchPlaceholder}
                  autoComplete="off"
                  className="w-full min-h-11 rounded-full border border-white/15 bg-slate-900/70 px-4 py-2 text-base text-gray-100 outline-none placeholder:text-gray-300"
                />
              </form>
              <p className="mt-1 text-center text-sm text-gray-200 md:text-left">{x.searchHint}</p>
            </div>
          </div>
          <AuthBar />
        </div>
      </div>

      <nav
        className="border-t border-white/5 bg-gradient-to-b from-slate-950/90 to-slate-900/95 py-2"
        aria-label={d.nav.mainNavAria}
      >
        <div className="site-container flex flex-col gap-2">
          <details className="group md:hidden">
            <summary className="min-h-11 cursor-pointer list-none rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-base font-semibold text-gray-100 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="after:ml-2 after:text-gray-300 after:content-['▾']">{x.menu}</span>
            </summary>
            <div className="mt-2 flex flex-col gap-1 rounded-lg border border-white/10 bg-slate-950/95 p-2">
              <a
                href="/auth/login"
                className="flex min-h-11 items-center justify-center rounded-md border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-center text-base font-semibold text-violet-50 no-underline"
              >
                {d.board.login}
              </a>
              <a
                href="/auth/signup"
                className="flex min-h-11 items-center justify-center rounded-md border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-center text-base font-semibold text-pink-50 no-underline"
              >
                {d.board.signup}
              </a>
              <Link
                href={WRITE_HREF}
                className="flex min-h-11 items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-center text-base font-semibold text-white no-underline"
              >
                ✎ {d.board.newPost}
              </Link>
              {NAV_MENUS.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="flex min-h-11 items-center rounded-md px-3 py-2 text-base text-gray-100 no-underline hover:bg-slate-800"
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
                className="inline-flex min-h-11 items-center rounded-full border border-transparent px-3 py-2 text-base font-semibold text-gray-100 no-underline hover:border-amber-400/40 hover:text-amber-200"
              >
                {m.label}
              </Link>
            ))}
            <Link
              href={WRITE_HREF}
              className="ml-auto inline-flex min-h-11 items-center rounded-full bg-blue-600 px-4 py-2 text-base font-bold text-white no-underline shadow-md hover:bg-blue-500"
            >
              ✎ {d.board.newPost}
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
