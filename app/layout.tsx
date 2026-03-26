import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import FxRemoteWidget from './_components/FxRemoteWidget';
import GlobalNav from './_components/GlobalNav';
import Providers from './_components/Providers';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { FX_SNAPSHOT_FALLBACK } from '@/lib/fx/fetchUsdFx';
import './globals.css';

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
  };
}

/**
 * 언어는 미들웨어가 넣은 `x-tj-locale`만 사용 (cookies() 미사용).
 * 홈·네비·푸터·환율 위젯 라벨이 언어 전환과 맞춰집니다.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const d = getDictionary(locale);

  return (
    <html lang={locale}>
      <body>
        <Providers>
          <GlobalNav
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
        <footer className="site-footer">{d.footer}</footer>
        <Analytics />
      </body>
    </html>
  );
}
