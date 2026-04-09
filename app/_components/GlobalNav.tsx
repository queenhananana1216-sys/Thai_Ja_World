'use client';

/**
 * app/_components/GlobalNav.tsx — 글로벌 상단 네비 + 언어 전환
 * (네이트형: 상단 얇은 툴바 → 흰 띠에 로고·로그인 패널 → 주요 메뉴 줄에 통합 검색)
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Dictionary } from '@/i18n/dictionaries';
import AuthBar from './AuthBar';
import { BrandPhrase } from './BrandPhrase';
import LanguageSwitch from './LanguageSwitch';
import SiteSearch from './SiteSearch';

const HREFS = ['/', '/tips', '/local', '/community/boards', '/ilchon', '/minihome'] as const;

type Props = {
  dict: Pick<Dictionary, 'nav' | 'brandSuffix' | 'logoAria' | 'lang' | 'board' | 'search'>;
  /** 관리자 화이트리스트(또는 개발용 허용 세션)일 때만 표시 */
  showAdminConsole?: boolean;
};

export default function GlobalNav({ dict, showAdminConsole = false }: Props) {
  const pathname = usePathname();
  /** 홈은 본문 포털 마스트에 통합 검색이 있어 헤더 검색을 숨겨 세로 중복·겹침을 줄임 */
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

  return (
    <header className="global-header">
      <div className="global-header__toolbar">
        <div className="site-container global-header__toolbar-inner">
          <LanguageSwitch labels={dict.lang} />
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
        </div>
      </div>

      <div className="global-header__nate-band">
        <div className="site-container global-header__nate-band-inner">
          <Link href="/" className="global-header__logo-nate" aria-label={dict.logoAria}>
            <BrandPhrase variant="light" />
            <span className="global-header__logo-suffix-nate">{dict.brandSuffix}</span>
          </Link>
          <aside className="global-header__nate-user">
            <AuthBar variant="natePanel" {...authProps} />
          </aside>
        </div>
      </div>

      <nav className="site-container global-header__main-nav" aria-label={dict.nav.mainNavAria}>
        <div
          className={
            'global-header__main-nav-bar' +
            (hideHeaderSearch ? ' global-header__main-nav-bar--nav-only' : '')
          }
        >
        <div className="global-header__nav">
          {HREFS.map((href, i) => {
            const isActive =
              href === '/'
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
      </nav>
    </header>
  );
}
