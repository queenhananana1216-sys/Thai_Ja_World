import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Noto_Sans_KR, Noto_Sans_Thai } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import FxRemoteWidget from './_components/FxRemoteWidget';
import VercelSpeedInsights from './_components/VercelSpeedInsights';
import GlobalNav from './_components/GlobalNav';
import PremiumTopBanner from './_components/PremiumTopBanner';
import Providers from './_components/Providers';
import ClientSafeBoundary from './_components/ClientSafeBoundary';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { fetchMergedHeroSiteCopy } from '@/lib/siteCopy/heroCopy';
import { getMergedDefaultsFromI18n } from '@/lib/siteCopy/heroCopyDefaults';
import { FX_SNAPSHOT_FALLBACK } from '@/lib/fx/fetchUsdFx';
import { getActiveUxFlagsServer } from '@/lib/ux/flagsServer';
import type { UxFlagMap } from '@/lib/ux/types';
import { resolveSplineScenes } from '@/lib/spline/resolver';
import type { SplineSceneRecord } from '@/lib/spline/types';
import './globals.css';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-noto-kr',
  display: 'swap',
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-th',
  display: 'swap',
});

/** 프로덕션 도메인 연결 시 OG/절대 URL 기준 — locale 쿠키에 맞춰 기본 메타 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const loc = await getLocale();
    const d = getDictionary(loc);
    return {
      metadataBase: new URL('https://www.thaijaworld.com'),
      title: {
        default: d.seo.defaultTitle,
        template: d.seo.titleTemplate,
      },
      description: d.seo.defaultDescription,
      icons: {
        icon: [{ url: '/icon.svg', type: 'image/svg+xml', sizes: '48x48' }],
      },
      verification: {
        other: {
          'naver-site-verification': 'a5e68e7ff5120e3afa1c6c2c5c49d59e193760bb',
        },
      },
    };
  } catch {
    return {
      metadataBase: new URL('https://www.thaijaworld.com'),
      title: {
        default: '태자월드',
        template: '%s | 태자월드',
      },
      description: '태국 교민 커뮤니티 태자월드',
      icons: {
        icon: [{ url: '/icon.svg', type: 'image/svg+xml', sizes: '48x48' }],
      },
    };
  }
}

/**
 * 모든 서버 의존 호출은 `Promise.allSettled`로 감싸고 실패 시 i18n 기본값으로 폴백.
 * 클라이언트 글로벌 UI는 `ClientSafeBoundary`로 격리해 단일 컴포넌트 예외가 전체를 블랙스크린으로 만들지 않게 함.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  let locale: Awaited<ReturnType<typeof getLocale>> = 'ko';
  try {
    locale = await getLocale();
  } catch {
    locale = 'ko';
  }
  const d = getDictionary(locale);

  const [uxFlagsSettled, adminSettled, heroCopySettled, splineSettled] = await Promise.allSettled([
    getActiveUxFlagsServer(),
    resolveAdminAccess(),
    fetchMergedHeroSiteCopy(),
    resolveSplineScenes(),
  ]);

  const uxFlags: UxFlagMap = uxFlagsSettled.status === 'fulfilled' ? uxFlagsSettled.value : {};
  const adminSession =
    adminSettled.status === 'fulfilled' ? adminSettled.value : (false as const);
  const heroSiteCopy =
    heroCopySettled.status === 'fulfilled' ? heroCopySettled.value : getMergedDefaultsFromI18n();
  const logoScene: SplineSceneRecord | null =
    splineSettled.status === 'fulfilled' ? splineSettled.value.logo : null;

  const noteLabelOverride =
    locale === 'th'
      ? (uxFlags['nav.member_notes_label']?.th as string | undefined)
      : (uxFlags['nav.member_notes_label']?.ko as string | undefined);
  const navForHeader = {
    ...d.nav,
    memberNotesInbox:
      typeof noteLabelOverride === 'string' && noteLabelOverride.trim()
        ? noteLabelOverride.trim()
        : d.nav.memberNotesInbox,
  };

  const deploySha = process.env.VERCEL_GIT_COMMIT_SHA ?? '';
  const requestMark = Math.random().toString(36).slice(2, 10);

  return (
    <html
      lang={locale}
      className={`${notoSansKr.variable} ${notoSansThai.variable} overflow-x-hidden`}
    >
      <body
        className="min-h-screen overflow-x-hidden bg-slate-900 text-slate-300"
        data-tj-deploy-sha={deploySha || undefined}
        data-tj-request-mark={requestMark}
      >
        <ClientSafeBoundary
          name="root-providers"
          fallback={<main className="min-h-screen overflow-x-hidden bg-slate-900">{children}</main>}
        >
          <Providers heroSiteCopy={heroSiteCopy} initialLocale={locale}>
            <main className="min-h-screen flex flex-col overflow-x-hidden bg-slate-900">
              <ClientSafeBoundary name="global-nav" fallback={null}>
                <GlobalNav
                  showAdminConsole={!!adminSession}
                  logoScene={logoScene}
                  dict={{
                    nav: navForHeader,
                    brandSuffix: d.brandSuffix,
                    logoAria: d.logoAria,
                    lang: d.lang,
                    board: d.board,
                    search: d.search,
                  }}
                />
              </ClientSafeBoundary>
              <PremiumTopBanner />
              <div className="flex-1 min-h-0 overflow-x-hidden bg-slate-900">{children}</div>
              <ClientSafeBoundary name="site-footer" fallback={null}>
                <SiteFooter />
              </ClientSafeBoundary>
            </main>
            <ClientSafeBoundary name="fx-remote-widget" fallback={null}>
              <FxRemoteWidget
                locale={locale}
                initial={{ ...FX_SNAPSHOT_FALLBACK, dateISO: new Date().toISOString() }}
                labels={d.home.fxRemote}
                panelTitle={d.home.fxTitle}
              />
            </ClientSafeBoundary>
          </Providers>
        </ClientSafeBoundary>
        <ClientSafeBoundary name="analytics" fallback={null}>
          <Analytics />
        </ClientSafeBoundary>
        <ClientSafeBoundary name="speed-insights" fallback={null}>
          <VercelSpeedInsights />
        </ClientSafeBoundary>
      </body>
    </html>
  );
}
