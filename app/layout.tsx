import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Noto_Sans_KR, Noto_Sans_Thai } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import FxRemoteWidget from './_components/FxRemoteWidget';
import VercelSpeedInsights from './_components/VercelSpeedInsights';
import GlobalNav from './_components/GlobalNav';
import Providers from './_components/Providers';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { fetchMergedHeroSiteCopy } from '@/lib/siteCopy/heroCopy';
import { FX_SNAPSHOT_FALLBACK } from '@/lib/fx/fetchUsdFx';
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
    metadataBase: new URL('https://thaijaworld.com'),
    title: {
      default: d.seo.defaultTitle,
      template: d.seo.titleTemplate,
    },
    description: d.seo.defaultDescription,
    /** 네이버 서치어드바이저 — HTML 태그 방식 소유확인 */
    verification: {
      other: {
        'naver-site-verification': '9242e16d7b7d2e8a177c9b1dbe89409aaa4a4f76',
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
  const adminSession = await resolveAdminAccess();
  const heroSiteCopy = await fetchMergedHeroSiteCopy();

  return (
    <html lang={locale} className={`${notoSansKr.variable} ${notoSansThai.variable}`}>
      <body>
        <Providers heroSiteCopy={heroSiteCopy}>
          <GlobalNav
            showAdminConsole={!!adminSession}
            dict={{
              nav: d.nav,
              brandSuffix: d.brandSuffix,
              logoAria: d.logoAria,
              lang: d.lang,
              board: d.board,
            }}
          />
          {children}
          <FxRemoteWidget
            locale={locale}
            initial={{ ...FX_SNAPSHOT_FALLBACK, dateISO: new Date().toISOString() }}
            labels={d.home.fxRemote}
            panelTitle={d.home.fxTitle}
          />
        </Providers>
        <Analytics />
        <VercelSpeedInsights />
        <footer className="site-footer">{d.footer}</footer>
      </body>
    </html>
  );
}
