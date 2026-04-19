'use client';

/**
 * app/_components/GlobalNav.tsx — 글로벌 상단 네비 + 언어 전환
 * (네이트형: 상단 얇은 툴바 → 흰 띠에 로고·대형 검색·로그인 패널 → 주요 메뉴 줄)
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Dictionary } from '@/i18n/dictionaries';
import AuthBar from './AuthBar';
import { BrandPhrase } from './BrandPhrase';
import LanguageSwitch from './LanguageSwitch';
import SiteSearch from './SiteSearch';

type Props = {
  dict: Pick<Dictionary, 'nav' | 'brandSuffix' | 'logoAria' | 'lang' | 'board'>;
  /** 관리자 화이트리스트(또는 개발용 허용 세션)일 때만 표시 */
  showAdminConsole?: boolean;
};

export default function GlobalNav({ dict, showAdminConsole = false }: Props) {
  const pathname = usePathname();
  const isThai = dict.lang.th === 'ไทย';
  const navItems = isThai
    ? [
        { href: '/hot-issues', label: 'Thai Ja World ประเด็นร้อน' },
        { href: '/community/boards?scope=general&cat=info', label: 'Thai Ja World ทิปส์' },
        { href: '/community/boards?scope=trade&cat=flea', label: 'Thai Ja World ตลาดมือสอง' },
        { href: '/community/boards?scope=trade&cat=job', label: 'Thai Ja World หางาน' },
        { href: '/community/boards?scope=general', label: 'Thai Ja World บอร์ดชุมชน' },
      ]
    : [
        { href: '/hot-issues', label: '태자월드 핫 이슈' },
        { href: '/community/boards?scope=general&cat=info', label: '태자월드 꿀팁' },
        { href: '/community/boards?scope=trade&cat=flea', label: '태자월드 번개장터' },
        { href: '/community/boards?scope=trade&cat=job', label: '태자월드 구인구직' },
        { href: '/community/boards?scope=general', label: '태자월드 게시판' },
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
          <div className="global-header__nate-search">
            <SiteSearch variant="headerNate" />
          </div>
          <aside className="global-header__nate-user">
            <AuthBar variant="natePanel" {...authProps} />
          </aside>
        </div>
      </div>

      <nav className="site-container global-header__main-nav" aria-label={dict.nav.mainNavAria}>
        <div className="global-header__nav">
          {navItems.map(({ href, label }) => {
            const isActive =
              href === '/hot-issues'
                ? pathname.startsWith('/hot-issues') || pathname.startsWith('/news/')
                : href.includes('/community/boards')
                  ? pathname.startsWith('/community/boards') || pathname.startsWith('/community/trade')
                  : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={
                  'global-header__link' + (isActive ? ' global-header__link--active' : '')
                }
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
