import './globals.css';
import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';

/** Vercel·CDN이 예전 HTML/헤더를 붙잡지 않도록 루트 세그먼트 전체 동적 렌더 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { cookies } from 'next/headers';
import AnalyticsTracker from './_components/AnalyticsTracker';
import GlobalNav from './_components/GlobalNav';
import { SiteFooterFallback } from './_components/SiteFooterFallback';
import { isLocale, LOCALE_COOKIE } from '@/i18n/types';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';
import { getSiteBaseUrl } from '@/lib/seo/site';

const brandNunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--tj-brand-nunito',
});

export async function generateMetadata(): Promise<Metadata> {
  const base = getSiteBaseUrl();
  const title = '태국에, 살자';
  const description = '태국에 사는 이웃과 함께 — 뉴스·로컬·광장 한곳에 모았어요.';
  return {
    metadataBase: new URL(base),
    title: {
      default: title,
      template: '%s | 태국에, 살자',
    },
    description,
    keywords: ['태국에 살자', '태국', '방콕', '교민', '커뮤니티', '한인', '뉴스', 'Thailand'],
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      url: base,
      siteName: title,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml', sizes: '48x48' }],
    },
    verification: {
      other: {
        'naver-site-verification': 'a5e68e7ff5120e3afa1c6c2c5c49d59e193760bb',
      },
    },
  };
}

export default async function RootLayout({ children }: { children: unknown }) {
  const jar = await cookies();
  const locRaw = jar.get(LOCALE_COOKIE)?.value ?? '';
  const htmlLang = isLocale(locRaw) && locRaw === 'th' ? 'th' : 'ko';
  const ui = await loadSiteUiSettings();

  return (
    <html
      lang={htmlLang}
      className={`overflow-x-hidden ${brandNunito.variable}`}
      data-tj-text-scale={ui.textScale}
    >
      <body
        className="flex min-h-screen flex-col overflow-x-hidden bg-[#0B0F19] text-base text-gray-100 antialiased"
        style={{
          margin: 0,
          minHeight: '100vh',
          backgroundColor: '#0b0f19',
          color: '#f1f5f9',
        }}
      >
        {/* CSS 번들 지연·실패 시에도 레이아웃이 “완전 무신호 검정”처럼 보이지 않게 하는 최소 표시 */}
        <div
          aria-hidden
          style={{
            height: 3,
            width: '100%',
            flexShrink: 0,
            background: 'linear-gradient(90deg, #fbbf24, #38bdf8, #c084fc)',
            opacity: 0.95,
          }}
        />
        <GlobalNav />
        {ui.healthSafeMode ? (
          <div
            role="status"
            className="border-b border-amber-500/40 bg-amber-950/90 px-4 py-2 text-center text-sm font-semibold text-amber-100"
          >
            안전 모드: 데이터베이스 연결 이슈가 감지되어 보수적으로 동작합니다. 운영에서 상태를 확인해 주세요.
          </div>
        ) : null}
        <AnalyticsTracker />
        <main className="relative z-0 min-h-[45vh] w-full flex-1 overflow-x-hidden">
          {children as import('react').ReactNode}
        </main>
        <SiteFooterFallback />
      </body>
    </html>
  );
}
