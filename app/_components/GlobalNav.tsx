'use client';

/**
 * 글로벌 상단 네비 — 인증은 툴바 우측 Pill 전용 (흰 띠에 거대 로그인 패널 없음)
 */
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import AuthBar from './AuthBar';
import LanguageSwitch from './LanguageSwitch';
import SiteSearch from './SiteSearch';
import type { SplineSceneRecord } from '@/lib/spline/types';
import { tryCreateBrowserClient } from '@/lib/supabase/client';

const PRIMARY_MENUS = [
  { href: '/', label: '홈' },
  { href: '/community/boards', label: '자유게시판' },
  { href: '/community/boards?cat=flea', label: '번개장터' },
  { href: '/community/boards?cat=job', label: '구인구직' },
  { href: '/community/boards?cat=info', label: '부동산' },
  { href: '/local', label: '로컬예약' },
] as const;
const WRITE_CTA_HREF = '/community/write';
const OWNER_SPLINE_FILE_URL = 'https://app.spline.design/file/2e7c81f2-50e3-458f-8663-2f54af2cf60d';
const LazySplineCanvas = dynamic(
  () => import('@/components/3d/SplineCanvas').then((mod) => mod.SplineCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-violet-300/20 bg-slate-900/75">
        <span className="animate-pulse text-[10px] font-semibold tracking-[0.3em] text-slate-200/70 md:text-xs">
          TAEJA WORLD
        </span>
      </div>
    ),
  },
);

type Props = {
  dict: Pick<Dictionary, 'nav' | 'brandSuffix' | 'logoAria' | 'lang' | 'board' | 'search'>;
  showAdminConsole?: boolean;
  logoScene?: SplineSceneRecord | null;
};

export default function GlobalNav({ dict, showAdminConsole = false, logoScene = null }: Props) {
  const pathname = usePathname() ?? '/';
  const hideHeaderSearch = pathname === '/';
  const [compactHeader, setCompactHeader] = useState(false);
  const [canViewAdminConsole, setCanViewAdminConsole] = useState(false);

  const authProps = {
    memberNav: {
      minihome: dict.nav.memberMinihome,
      notesInbox: dict.nav.memberNotesInbox,
      friends: dict.nav.memberFriends,
      ariaLabel: dict.nav.memberQuickNavAria,
    },
    labels: {
      login: dict.board.login,
      signup: dict.board.signup,
      logout: dict.board.logout,
    },
  };

  function linkActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/community/boards')) {
      return pathname.startsWith('/community/boards') || pathname.startsWith('/community/trade');
    }
    return pathname.startsWith(href);
  }

  useEffect(() => {
    const onScroll = () => setCompactHeader(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let alive = true;
    if (!showAdminConsole) {
      setCanViewAdminConsole(false);
      return;
    }
    const sb = tryCreateBrowserClient();
    if (!sb) {
      setCanViewAdminConsole(false);
      return;
    }
    const sbClient = sb;

    async function verifyAdminRole() {
      const {
        data: { session },
      } = await sbClient.auth.getSession();
      const user = session?.user;
      if (!alive || !user) {
        setCanViewAdminConsole(false);
        return;
      }

      const appRole =
        typeof user.app_metadata?.role === 'string' ? user.app_metadata.role.trim().toLowerCase() : '';
      if (appRole === 'admin' || appRole === 'owner' || appRole === 'super_admin') {
        setCanViewAdminConsole(true);
        return;
      }

      const { data: profile } = await sbClient
        .from('profiles')
        .select('role, is_admin')
        .eq('id', user.id)
        .maybeSingle();
      if (!alive) return;

      const role = typeof profile?.role === 'string' ? profile.role.trim().toLowerCase() : '';
      const hasAdminRole = role === 'admin' || role === 'owner' || role === 'super_admin';
      const isAdmin = profile?.is_admin === true;
      setCanViewAdminConsole(Boolean(hasAdminRole || isAdmin));
    }

    void verifyAdminRole();
    const {
      data: { subscription },
    } = sbClient.auth.onAuthStateChange(() => {
      void verifyAdminRole();
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [showAdminConsole]);

  return (
    <header className={`global-header${compactHeader ? ' global-header--compact' : ''}`}>
      <div className="global-header__toolbar">
        <div className="site-container global-header__toolbar-inner">
          <div className="global-header__toolbar-start">
            <LanguageSwitch labels={dict.lang} />
          </div>
          <div className="global-header__toolbar-end">
            {canViewAdminConsole && (
              <Link
                href="/admin"
                className={
                  'global-header__console global-header__console--subtle' +
                  (pathname.startsWith('/admin') ? ' global-header__console--active' : '')
                }
              >
                {dict.nav.botConsole}
              </Link>
            )}
            <AuthBar variant="chromePills" {...authProps} />
          </div>
        </div>
      </div>

      <div className="global-header__nate-band">
        <div className="site-container global-header__nate-band-inner">
          <Link
            href="/"
            className="global-header__logo-nate inline-flex items-center"
            aria-label={dict.logoAria}
          >
            <span
              aria-hidden
              className="relative block h-10 w-32 shrink-0 overflow-hidden rounded-xl border border-violet-300/20 bg-slate-950/80 md:h-12 md:w-40"
            >
              <LazySplineCanvas
                slot="logo"
                publishedUrl={
                  logoScene && logoScene.isEnabled && logoScene.publishedUrl
                    ? logoScene.publishedUrl
                    : OWNER_SPLINE_FILE_URL
                }
                sceneCodeUrl={
                  logoScene && logoScene.isEnabled && logoScene.sceneCodeUrl
                    ? logoScene.sceneCodeUrl
                    : undefined
                }
                quality={logoScene?.qualityTier ?? 'high'}
                placeholderTone="dark"
                interactive
                title="TAEJA WORLD 2026 3D Logo"
              />
            </span>
            <span className="sr-only">{dict.brandSuffix}</span>
          </Link>
        </div>
      </div>

      <nav className="global-header__main-nav" aria-label={dict.nav.mainNavAria}>
        <div className="site-container">
          <div
            className={
              'global-header__main-nav-bar' +
              (hideHeaderSearch ? ' global-header__main-nav-bar--nav-only' : '')
            }
          >
            <div className="flex w-full items-center gap-2 md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 border-white/25 bg-slate-800/70 text-white hover:bg-slate-700/85 hover:text-white"
                    aria-label={dict.nav.mainNavAria}
                  >
                    <Menu className="size-5" aria-hidden />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="border-zinc-700 bg-zinc-950 text-zinc-50 [&_button]:text-zinc-50"
                >
                  <SheetHeader>
                    <SheetTitle className="text-left text-zinc-50">{dict.nav.mainNavAria}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex flex-col gap-1 pr-2">
                    <Link
                      href={`/auth/login?next=${encodeURIComponent(pathname)}`}
                      className="mb-2 rounded-md border border-violet-300/40 bg-violet-300/10 px-3 py-2.5 text-sm font-semibold text-violet-100 no-underline transition hover:bg-violet-300/20"
                    >
                      {dict.board.login}
                    </Link>
                    <Link
                      href={`/auth/signup?next=${encodeURIComponent(pathname)}`}
                      className="mb-2 rounded-md border border-pink-300/40 bg-pink-300/10 px-3 py-2.5 text-sm font-semibold text-pink-100 no-underline transition hover:bg-pink-300/20"
                    >
                      {dict.board.signup}
                    </Link>
                    <Link
                      href={WRITE_CTA_HREF}
                      className="mb-2 rounded-md border border-blue-300/45 bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_0_0_1px_rgba(147,197,253,0.3),0_10px_24px_rgba(37,99,235,0.35)] transition hover:bg-blue-500"
                    >
                      ✎ 글쓰기
                    </Link>
                    {PRIMARY_MENUS.map((menu) => {
                      const isActive = linkActive(menu.href);
                      return (
                        <Link
                          key={menu.href}
                          href={menu.href}
                          className={
                            'rounded-md px-3 py-2.5 text-sm font-medium no-underline transition-colors ' +
                            (isActive
                              ? 'bg-slate-800 text-museum-saffron shadow-[0_0_0_1px_rgba(250,204,21,0.42),0_0_14px_rgba(250,204,21,0.2)]'
                              : 'text-zinc-100 hover:bg-slate-800/70 hover:text-white hover:shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_12px_rgba(59,130,246,0.35)]')
                          }
                        >
                          {menu.label}
                        </Link>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
              {!hideHeaderSearch ? (
                <div className="global-header__main-nav-search min-w-0 flex-1">
                  <SiteSearch variant="header" />
                </div>
              ) : null}
            </div>

            <div className="hidden md:contents">
              <div className="global-header__nav">
                {PRIMARY_MENUS.map((menu) => {
                  const isActive = linkActive(menu.href);
                  return (
                    <Link
                      key={menu.href}
                      href={menu.href}
                      className={
                        'global-header__link' + (isActive ? ' global-header__link--active' : '')
                      }
                    >
                      {menu.label}
                    </Link>
                  );
                })}
              </div>
              <Link
                href={WRITE_CTA_HREF}
                className="rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold tracking-tight text-white no-underline shadow-[0_0_0_1px_rgba(147,197,253,0.4),0_10px_24px_rgba(37,99,235,0.38)] transition hover:bg-blue-500 hover:shadow-[0_0_0_1px_rgba(250,204,21,0.45),0_0_16px_rgba(59,130,246,0.45)]"
              >
                ✎ 글쓰기
              </Link>
              {!hideHeaderSearch ? (
                <div className="global-header__main-nav-search">
                  <SiteSearch variant="header" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
