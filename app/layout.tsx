import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import AnalyticsTracker from './_components/AnalyticsTracker';
import { IntentRoutePrefetch } from './_components/IntentRoutePrefetch';
import GlobalToaster from './_components/GlobalToaster';
import GlobalNav from './_components/GlobalNav';
import MobileBottomNav from './_components/MobileBottomNav';
import PortalActivityTicker from './_components/PortalActivityTicker';
import ActivityBeaconClient from './_components/ActivityBeaconClient';
import { SiteFooterFallback } from './_components/SiteFooterFallback';
import { GlobalLanguageProvider } from '@/contexts/GlobalLanguageContext';
import { SiteBrandProvider } from '@/contexts/SiteBrandContext';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';
import { getSiteBaseUrl } from '@/lib/seo/site';
import { TjRouteSuspenseFallback } from './_components/TjRouteSuspenseFallback';

/** Vercel·CDN이 예전 HTML/헤더를 붙잡지 않도록 루트 세그먼트 전체 동적 렌더 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const base = getSiteBaseUrl();
  const ui = await loadSiteUiSettings();
  const title = ui.siteDisplayName;
  const description =
    '태국에, 살자(Living in Thai) — 태국 거주·체류 한인·교민 커뮤니티. 비자·뉴스·로컬 가게·광장을 한곳에서. 공식 생활 정보·참여형 포털.';
  return {
    metadataBase: new URL(base),
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    keywords: [
      title,
      '태국에, 살자',
      'Living in Thai',
      '태국 교민',
      '태국 한인',
      '방콕',
      '비자',
      '커뮤니티',
      '뉴스',
      'Thailand',
      'Korean in Thailand',
    ],
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
  const locale = await getLocale();
  const initialDictionary = await getDictionary(locale);
  const ui = await loadSiteUiSettings();

  return (
    <html
      lang={locale}
      className="overflow-x-hidden"
      data-tj-text-scale={ui.textScale}
    >
      <body
        className="flex min-h-screen flex-col overflow-x-hidden bg-[#0B0F19] text-gray-100 antialiased"
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
        <SiteBrandProvider initialDisplayName={ui.siteDisplayName}>
          <GlobalLanguageProvider initialLocale={locale} initialDictionary={initialDictionary}>
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
        <IntentRoutePrefetch />
        <GlobalToaster />
        <main className="relative z-0 min-h-[45vh] w-full flex-1 overflow-x-hidden pb-[calc(8.75rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <Suspense fallback={<TjRouteSuspenseFallback />}>{children as import('react').ReactNode}</Suspense>
        </main>
        <SiteFooterFallback siteDisplayName={ui.siteDisplayName} />
        <PortalActivityTicker locale={locale === 'th' ? 'th' : 'ko'} />
        <MobileBottomNav />
        <ActivityBeaconClient />
          </GlobalLanguageProvider>
        </SiteBrandProvider>
      </body>
    </html>
  );
}
