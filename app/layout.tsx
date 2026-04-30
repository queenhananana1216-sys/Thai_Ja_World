import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Noto_Sans_KR, Noto_Sans_Thai } from 'next/font/google';
import ClientSafeBoundary from './_components/ClientSafeBoundary';
import DeferredVercelObservability from './_components/DeferredVercelObservability';
import FxRemoteWidget from './_components/FxRemoteWidget';
import GlobalNav from './_components/GlobalNav';
import { GlobalNavFallback } from './_components/GlobalNavFallback';
import PremiumTopBanner from './_components/PremiumTopBanner';
import Providers from './_components/Providers';
import { SiteFooterFallback } from './_components/SiteFooterFallback';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { fetchMergedHeroSiteCopy } from '@/lib/siteCopy/heroCopy';
import { getMergedDefaultsFromI18n } from '@/lib/siteCopy/heroCopyDefaults';
import { FX_SNAPSHOT_FALLBACK } from '@/lib/fx/fetchUsdFx';
import { getActiveUxFlagsServer } from '@/lib/ux/flagsServer';
import type { UxFlagMap } from '@/lib/ux/types';
import { getSiteBaseUrl } from '@/lib/seo/site';
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

export async function generateMetadata(): Promise<Metadata> {
  try {
    const loc = await getLocale();
    const d = getDictionary(loc);
    return {
      metadataBase: new URL(getSiteBaseUrl()),
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
      metadataBase: new URL(getSiteBaseUrl()),
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  let locale: Awaited<ReturnType<typeof getLocale>> = 'ko';
  try {
    locale = await getLocale();
  } catch {
    locale = 'ko';
  }
  const d = getDictionary(locale);

  const [uxFlagsSettled, heroCopySettled] = await Promise.allSettled([
    getActiveUxFlagsServer(),
    fetchMergedHeroSiteCopy(),
  ]);

  const uxFlags: UxFlagMap = uxFlagsSettled.status === 'fulfilled' ? uxFlagsSettled.value : {};
  const heroSiteCopy =
    heroCopySettled.status === 'fulfilled' ? heroCopySettled.value : getMergedDefaultsFromI18n();

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

  const rootChromeFallback = (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#0B0F19] text-slate-200">
      <GlobalNavFallback />
      <main className="min-h-0 flex-1 overflow-x-hidden">{children}</main>
      <SiteFooterFallback />
    </div>
  );

  return (
    <html lang={locale} className={`${notoSansKr.variable} ${notoSansThai.variable} overflow-x-hidden`}>
      <body
        className="min-h-screen overflow-x-hidden bg-[#0B0F19] text-slate-200"
        data-tj-deploy-sha={deploySha || undefined}
      >
        <ClientSafeBoundary name="root-providers" fallback={rootChromeFallback}>
          <Providers heroSiteCopy={heroSiteCopy} initialLocale={locale}>
            <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#0B0F19] text-slate-200">
              <ClientSafeBoundary name="global-nav" fallback={<GlobalNavFallback />}>
                <GlobalNav
                  dict={{
                    nav: navForHeader,
                    brandSuffix: d.brandSuffix,
                    logoAria: d.logoAria,
                    lang: d.lang,
                    search: d.search,
                  }}
                />
              </ClientSafeBoundary>
              <PremiumTopBanner />
              <div className="min-h-0 flex-1 overflow-x-hidden">{children}</div>
              <ClientSafeBoundary name="site-footer" fallback={<SiteFooterFallback />}>
                <SiteFooter />
              </ClientSafeBoundary>
            </div>
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
        <ClientSafeBoundary name="deferred-observability" fallback={null}>
          <DeferredVercelObservability />
        </ClientSafeBoundary>
      </body>
    </html>
  );
}
