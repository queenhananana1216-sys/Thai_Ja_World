'use client';

/**
 * 글로벌 상단 네비 — 인증은 툴바 우측 Pill 전용 (흰 띠에 거대 로그인 패널 없음)
 */
import Link from 'next/link';
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
import { BrandPhrase } from './BrandPhrase';
import LanguageSwitch from './LanguageSwitch';
import SiteSearch from './SiteSearch';
import { SplineCanvas } from '@/components/3d/SplineCanvas';
import type { SplineSceneRecord } from '@/lib/spline/types';

const PRIMARY_MENUS = [
  { href: '/', label: '홈' },
  { href: '/community/boards', label: '자유게시판' },
  { href: '/community/boards?cat=flea', label: '번개장터' },
  { href: '/community/boards?cat=job', label: '구인구직' },
  { href: '/community/boards?cat=info', label: '부동산' },
  { href: '/local', label: '로컬예약' },
] as const;
const WRITE_CTA_HREF = '/community/write';

type Props = {
  dict: Pick<Dictionary, 'nav' | 'brandSuffix' | 'logoAria' | 'lang' | 'board' | 'search'>;
  showAdminConsole?: boolean;
  logoScene?: SplineSceneRecord | null;
};

export default function GlobalNav({ dict, showAdminConsole = false, logoScene = null }: Props) {
  const pathname = usePathname() ?? '/';
  const hideHeaderSearch = pathname === '/';
  const [compactHeader, setCompactHeader] = useState(false);

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

  return (
    <header className={`global-header${compactHeader ? ' global-header--compact' : ''}`}>
      <div className="global-header__toolbar">
        <div className="site-container global-header__toolbar-inner">
          <div className="global-header__toolbar-start">
            <LanguageSwitch labels={dict.lang} />
          </div>
          <div className="global-header__toolbar-end">
            {showAdminConsole && (
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
            className="global-header__logo-nate"
            aria-label={dict.logoAria}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {logoScene && logoScene.isEnabled && (logoScene.sceneCodeUrl || logoScene.publishedUrl) ? (
              <span
                aria-hidden
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  overflow: 'hidden',
                  borderRadius: 10,
                }}
              >
                <SplineCanvas
                  slot="logo"
                  publishedUrl={logoScene.publishedUrl}
                  sceneCodeUrl={logoScene.sceneCodeUrl}
                  quality={logoScene.qualityTier}
                  placeholderTone="dark"
                  title="Thai Ja World Logo 3D"
                />
              </span>
            ) : null}
            <BrandPhrase variant="light" />
            <span className="global-header__logo-suffix-nate">{dict.brandSuffix}</span>
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
