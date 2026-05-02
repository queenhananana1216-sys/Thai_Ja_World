/**
 * 로고/헤더는 이 컴포넌트가 아니라 `app/layout.tsx`의 세그먼트 설정(`dynamic`/`revalidate`)으로 캐시가 결정됩니다.
 */
import Link from 'next/link';
import GuestGateButtonLink from './GuestGateButtonLink';
import AuthBarClient from './AuthBarClient';
import SpotlightNavSearch from './SpotlightNavSearch';
import { getLocale } from '@/i18n/get-locale';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/types';
import { resolveAdminForUser } from '@/lib/admin/resolveAdminAccess';
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
      myMinihome: 'มินิโฮมของฉัน',
      masterAdmin: 'มาสเตอร์แอดมิน',
    };
  }
  if (locale === 'en') {
    return {
      flea: 'Flea market',
      jobs: 'Jobs',
      realestate: 'Real estate',
      news: 'News',
      menu: 'Menu',
      myMinihome: 'My minihome',
      masterAdmin: 'Master admin',
    };
  }
  if (locale === 'zh') {
    return {
      flea: '二手市集',
      jobs: '招聘求职',
      realestate: '房产',
      news: '资讯',
      menu: '菜单',
      myMinihome: '我的迷你主页',
      masterAdmin: '总管理员',
    };
  }
  return {
    flea: '번개장터',
    jobs: '구인구직',
    realestate: '부동산',
    news: '뉴스',
    menu: '메뉴',
    myMinihome: '내 미니홈',
    masterAdmin: '마스터 관리자',
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
  let showMasterAdmin = false;

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
      const emailLower = user.email?.trim().toLowerCase() ?? '';
      const adminRes = await resolveAdminForUser(authSb, user.id, emailLower);
      showMasterAdmin = adminRes !== false;
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
    showMasterAdmin = false;
  }

  const authLabels = {
    login: d.board.login,
    signup: d.board.signup,
    logout: d.board.logout,
  };

  const koreanBizNavLabel =
    locale === 'th'
      ? '🇰🇷 ชีวิตเกาหลี (มาร์ท/ร้านยา/โรงพยาบาล)'
      : locale === 'en'
        ? '🇰🇷 Korean community (mart/pharmacy/hospital)'
        : locale === 'zh'
          ? '🇰🇷 韩人生活（超市/药房/医院）'
          : '🇰🇷 한인 생활망 (마트/약국/병원)';

  const NAV_MENUS: { href: string; label: string }[] = [
    { href: '/', label: d.nav.home },
    { href: '/boards', label: d.nav.boards },
    { href: '/community/boards', label: d.nav.community },
    { href: '/community/boards?cat=flea', label: x.flea },
    { href: '/community/boards?cat=job', label: x.jobs },
    { href: '/local/info', label: x.realestate },
    { href: '/local', label: d.nav.local },
    { href: '/korean-biz', label: koreanBizNavLabel },
    { href: '/news', label: x.news },
  ];

  const koreanBizDesktopClass =
    'inline-flex min-h-11 max-w-[min(100%,18rem)] items-center rounded-full border border-amber-400/45 bg-amber-500/[0.12] px-3 py-2 text-sm font-bold text-amber-50 no-underline shadow-[0_0_28px_rgba(251,191,36,0.18)] backdrop-blur-md transition hover:border-amber-300/70 hover:bg-amber-500/20 md:text-base';
  const koreanBizMobileClass =
    'flex min-h-11 items-center rounded-xl border border-amber-400/45 bg-amber-500/[0.14] px-3 py-2 text-base font-bold text-amber-50 no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md hover:border-amber-300/60 hover:bg-amber-500/20';
  const navLinkDefaultDesktop =
    'inline-flex min-h-11 items-center rounded-full border border-transparent px-3 py-2 text-base font-semibold text-gray-100 no-underline hover:border-amber-400/40 hover:text-amber-200';
  const navLinkDefaultMobile =
    'flex min-h-11 items-center rounded-md px-3 py-2 text-base text-gray-100 no-underline hover:bg-slate-800';

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
            className="flex shrink-0 flex-wrap items-center gap-1 text-sm font-semibold text-gray-200"
            aria-label={locale === 'th' ? 'ภาษา' : locale === 'zh' ? '语言' : locale === 'en' ? 'Language' : '언어'}
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
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <a
              href="?lang=en"
              className="inline-flex min-h-11 items-center rounded border border-white/15 px-2.5 text-gray-100 no-underline transition-colors hover:border-white/30 hover:text-white"
            >
              {d.lang.en}
            </a>
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <a
              href="?lang=zh"
              className="inline-flex min-h-11 items-center rounded border border-white/15 px-2.5 text-gray-100 no-underline transition-colors hover:border-white/30 hover:text-white"
            >
              {d.lang.zh}
            </a>
          </div>
          <div className="order-3 w-full min-w-0 max-w-xl flex-1 md:order-none md:w-auto md:max-w-md">
            <div className="w-full min-w-0">
              <SpotlightNavSearch />
            </div>
          </div>
          <AuthBarClient
            initialUser={authUser}
            initialDisplayName={profileDisplayName}
            labels={authLabels}
            profileHref={myMinihomeHref}
            myMinihomeLabel={x.myMinihome}
            masterAdminLabel={x.masterAdmin}
            showMasterAdmin={showMasterAdmin}
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
              <AuthBarClient
                variant="mobile"
                initialUser={authUser}
                initialDisplayName={profileDisplayName}
                labels={authLabels}
                profileHref={myMinihomeHref}
                myMinihomeLabel={x.myMinihome}
                masterAdminLabel={x.masterAdmin}
                showMasterAdmin={showMasterAdmin}
              />
              <GuestGateButtonLink
                href={WRITE_HREF}
                isLoggedIn={Boolean(authUser)}
                className="flex min-h-11 items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-center text-base font-semibold text-white no-underline"
              >
                ✎ {d.board.newPost}
              </GuestGateButtonLink>
              {NAV_MENUS.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className={m.href === '/korean-biz' ? koreanBizMobileClass : navLinkDefaultMobile}
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
                className={m.href === '/korean-biz' ? koreanBizDesktopClass : navLinkDefaultDesktop}
              >
                {m.label}
              </Link>
            ))}
            <GuestGateButtonLink
              href={WRITE_HREF}
              isLoggedIn={Boolean(authUser)}
              className="ml-auto inline-flex min-h-11 items-center rounded-full bg-blue-600 px-4 py-2 text-base font-bold text-white no-underline shadow-md hover:bg-blue-500"
            >
              ✎ {d.board.newPost}
            </GuestGateButtonLink>
          </div>
        </div>
      </nav>
    </div>
  );
}
