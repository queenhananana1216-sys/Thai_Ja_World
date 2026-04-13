import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Noto_Sans_KR, Noto_Sans_Thai } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import FxRemoteWidget from './_components/FxRemoteWidget';
import VercelSpeedInsights from './_components/VercelSpeedInsights';
import GlobalNav from './_components/GlobalNav';
import PremiumTopBanner from './_components/PremiumTopBanner';
import Providers from './_components/Providers';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { fetchMergedHeroSiteCopy } from '@/lib/siteCopy/heroCopy';
import { FX_SNAPSHOT_FALLBACK } from '@/lib/fx/fetchUsdFx';
import { getActiveUxFlagsServer } from '@/lib/ux/flagsServer';
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
  const loc = await getLocale();
  const d = getDictionary(loc);
  return {
    metadataBase: new URL('https://www.thaijaworld.com'),
    title: {
      default: d.seo.defaultTitle,
      template: d.seo.titleTemplate,
    },
    description: d.seo.defaultDescription,
    /** 탭·검색 결과 파비콘 — app/icon.svg (피그마 PNG로 바꿀 땐 app/icon.png 권장, 48×48 이상) */
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml', sizes: '48x48' }],
    },
    /** 네이버 서치어드바이저 — HTML 태그 방식 소유확인 */
    verification: {
      other: {
        'naver-site-verification': 'a5e68e7ff5120e3afa1c6c2c5c49d59e193760bb',
      },
    },
  };
}

/**
 * 언어는 미들웨어가 넣은 `x-tj-locale`만 사용 (cookies() 미사용).
 * 홈·네비·푸터·환율 위젯 라벨이 언어 전환과 맞춰집니다.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const uxFlags = await getActiveUxFlagsServer();
  const adminSession = await resolveAdminAccess();
  const heroSiteCopy = await fetchMergedHeroSiteCopy();
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

  /** Vercel 빌드 시 커밋 SHA — 페이지 소스에서 배포가 최신인지 확인용 */
  const deploySha = process.env.VERCEL_GIT_COMMIT_SHA ?? '';

  return (
    <html lang={locale} className={`${notoSansKr.variable} ${notoSansThai.variable}`}>
      <body data-tj-deploy-sha={deploySha || undefined}>
        <Providers heroSiteCopy={heroSiteCopy}>
          <GlobalNav
            showAdminConsole={!!adminSession}
            dict={{
              nav: navForHeader,
              brandSuffix: d.brandSuffix,
              logoAria: d.logoAria,
              lang: d.lang,
              board: d.board,
              search: d.search,
            }}
          />
          <PremiumTopBanner />
          {children}
          <SiteFooter />
          <FxRemoteWidget
            locale={locale}
            initial={{ ...FX_SNAPSHOT_FALLBACK, dateISO: new Date().toISOString() }}
            labels={d.home.fxRemote}
            panelTitle={d.home.fxTitle}
          />
        </Providers>
        <Analytics />
        <VercelSpeedInsights />
      </body>
    </html>
  );
}
