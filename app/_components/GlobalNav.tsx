/**
 * 로고/헤더는 이 컴포넌트가 아니라 `app/layout.tsx`의 세그먼트 설정(`dynamic`/`revalidate`)으로 캐시가 결정됩니다.
 */
import Link from 'next/link';
import AuthBarClient from './AuthBarClient';
import { getLocale } from '@/i18n/get-locale';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/types';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

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
      myMinihome: 'มินิโฮมของฉัน',
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
    myMinihome: '내 미니홈',
  };
}

export default async function GlobalNav() {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const x = headerExtraLabels(locale);

  /** 비로그인이면 null — 버튼 미렌더. 로그인만 동일 Supabase(쿠키 JWT)로 슬러그 조회 (anon 분리 조회 금지). */
  let myMinihomeHref: string | null = null;
  let authUser: { id: string; email: string | null } | null = null;
  let profileDisplayName: string | null = null;

  try {
    const authSb = await createServerSupabaseAuthClient();
    const {
      data: { user },
      error: userErr,
    } = await authSb.auth.getUser();
    if (userErr || !user?.id) {
      myMinihomeHref = null;
      authUser = null;
      profileDisplayName = null;
    } else {
      authUser = { id: user.id, email: user.email ?? null };
      const { data: prof } = await authSb
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();
      profileDisplayName =
        typeof prof?.display_name === 'string' && prof.display_name.trim()
          ? prof.display_name.trim()
          : null;

      const { data: hm, error: hmErr } = await authSb
        .from('user_minihomes')
        .select('public_slug')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (hmErr) {
        myMinihomeHref = '/minihome';
      } else {
        const slug = typeof hm?.public_slug === 'string' ? hm.public_slug.trim() : '';
        myMinihomeHref = slug ? `/minihome/${encodeURIComponent(slug)}` : '/minihome';
      }
    }
  } catch {
    myMinihomeHref = null;
    authUser = null;
    profileDisplayName = null;
  }

  const authLabels = {
    login: d.board.login,
    signup: d.board.signup,
    logout: d.board.logout,
  };

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
          className="inline-flex max-w-[min(100%,22rem)] items-center gap-2.5 no-underline md:gap-3"
          aria-label={d.logoAria}
        >
          <span
            className="select-none text-[2.35rem] leading-none drop-shadow-[0_2px_14px_rgba(251,191,36,0.45)] md:text-[2.85rem]"
            aria-hidden
          >
            🐘
          </span>
          <span
            className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-slate-900/85 via-slate-900/55 to-amber-950/35 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md md:px-3.5 md:py-2"
          >
            <span
              className="block bg-gradient-to-r from-amber-50 via-amber-300 to-yellow-200 bg-clip-text text-[1.05rem] font-extrabold tracking-tight text-transparent md:text-[1.15rem]"
              style={{ fontFamily: 'var(--tj-brand-nunito), var(--font-noto-kr), system-ui, sans-serif' }}
            >
              {d.brandLockup}
            </span>
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
          {myMinihomeHref ? (
            <Link
              href={myMinihomeHref}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-fuchsia-400/35 bg-gradient-to-r from-fuchsia-600/35 to-violet-600/35 px-4 py-2 text-sm font-bold text-fuchsia-50 no-underline shadow-[0_0_24px_rgba(192,38,211,0.25)] transition hover:border-fuchsia-300/60 hover:from-fuchsia-500/45 hover:to-violet-500/45"
            >
              🏠 {x.myMinihome}
            </Link>
          ) : null}
          <AuthBarClient
            initialUser={authUser}
            initialDisplayName={profileDisplayName}
            labels={authLabels}
            profileHref={myMinihomeHref}
          />
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
              {myMinihomeHref ? (
                <Link
                  href={myMinihomeHref}
                  className="flex min-h-11 items-center justify-center rounded-md border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-600/40 to-violet-600/35 px-3 py-2 text-center text-base font-bold text-fuchsia-50 no-underline"
                >
                  🏠 {x.myMinihome}
                </Link>
              ) : null}
              <AuthBarClient
                variant="mobile"
                initialUser={authUser}
                initialDisplayName={profileDisplayName}
                labels={authLabels}
                profileHref={myMinihomeHref}
              />
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
            {myMinihomeHref ? (
              <Link
                href={myMinihomeHref}
                className="inline-flex min-h-11 items-center rounded-full border border-fuchsia-400/35 bg-fuchsia-950/40 px-3 py-2 text-base font-bold text-fuchsia-100 no-underline hover:border-fuchsia-300/55 hover:bg-fuchsia-900/50"
              >
                🏠 {x.myMinihome}
              </Link>
            ) : null}
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
