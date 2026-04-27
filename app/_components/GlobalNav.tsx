'use client';

/**
 * 글로벌 상단 네비 — 인증은 툴바 우측 Pill 전용 (흰 띠에 거대 로그인 패널 없음)
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
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

const HREFS = ['/', '/tips', '/local', '/community/boards', '/ilchon', '/minihome'] as const;

type Props = {
  dict: Pick<Dictionary, 'nav' | 'brandSuffix' | 'logoAria' | 'lang' | 'board' | 'search'>;
  showAdminConsole?: boolean;
  logoScene?: SplineSceneRecord | null;
};

export default function GlobalNav({ dict, showAdminConsole = false, logoScene = null }: Props) {
  const pathname = usePathname() ?? '/';
  const hideHeaderSearch = pathname === '/';

  const labels = [
    dict.nav.home,
    dict.nav.tips,
    dict.nav.local,
    dict.nav.community,
    dict.nav.ilchon,
    dict.nav.minihome,
  ];

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
    return href === '/'
      ? pathname === '/'
      : href === '/tips'
        ? pathname === '/tips' || pathname.startsWith('/tips/')
        : href === '/community/boards'
          ? pathname.startsWith('/community/boards') || pathname.startsWith('/community/trade')
          : href === '/ilchon'
            ? pathname.startsWith('/ilchon')
            : href === '/minihome'
              ? pathname.startsWith('/minihome')
              : pathname.startsWith(href);
  }

  return (
    <header className="global-header">
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
                  placeholderTone="light"
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
                    className="shrink-0 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
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
                    {HREFS.map((href, i) => {
                      const isActive = linkActive(href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={
                            'rounded-md px-3 py-2.5 text-sm font-medium no-underline transition-colors ' +
                            (isActive
                              ? 'bg-white/15 text-museum-saffron'
                              : 'text-zinc-100 hover:bg-white/10 hover:text-white')
                          }
                        >
                          {labels[i]}
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
                {HREFS.map((href, i) => {
                  const isActive = linkActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={
                        'global-header__link' + (isActive ? ' global-header__link--active' : '')
                      }
                    >
                      {labels[i]}
                    </Link>
                  );
                })}
              </div>
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
