'use client';

/**
 * app/_components/GlobalNav.tsx — 글로벌 상단 네비 + 언어 전환
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Dictionary } from '@/i18n/dictionaries';
import AuthBar from './AuthBar';
import { BrandPhrase } from './BrandPhrase';
import LanguageSwitch from './LanguageSwitch';

const HREFS = ['/', '/local', '/community/boards', '/ilchon'] as const;

type Props = {
  dict: Pick<Dictionary, 'nav' | 'brandSuffix' | 'logoAria' | 'lang' | 'board'>;
  /** 관리자 화이트리스트(또는 개발용 허용 세션)일 때만 표시 */
  showAdminConsole?: boolean;
};

export default function GlobalNav({ dict, showAdminConsole = false }: Props) {
  const pathname = usePathname();
  const labels = [dict.nav.home, dict.nav.local, dict.nav.community, dict.nav.ilchon];

  return (
    <header className="global-header">
      <nav className="site-container global-header__inner">
        <Link href="/" className="global-header__logo" aria-label={dict.logoAria}>
          <BrandPhrase variant="dark" />
          <span className="global-header__logo-suffix">{dict.brandSuffix}</span>
        </Link>
        <div className="global-header__nav">
          {HREFS.map((href, i) => {
            const isActive =
              href === '/'
                ? pathname === '/'
                : href === '/community/boards'
                  ? pathname.startsWith('/community/boards') || pathname.startsWith('/community/trade')
                  : href === '/ilchon'
                    ? pathname.startsWith('/ilchon')
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
        <AuthBar
          labels={{
            login: dict.board.login,
            signup: dict.board.signup,
            logout: dict.board.logout,
          }}
        />
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
      </nav>
    </header>
  );
}
