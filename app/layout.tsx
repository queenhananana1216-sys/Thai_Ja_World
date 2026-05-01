import './globals.css';
import Link from 'next/link';
import Providers from './_components/Providers';
import GlobalNav from './_components/GlobalNav';
import { GlobalNavErrorBoundary } from './_components/GlobalNavErrorBoundary';
import { getLocale } from '@/i18n/get-locale';
import { fetchMergedHeroSiteCopy } from '@/lib/siteCopy/heroCopy';
import { getMergedDefaultsFromI18n } from '@/lib/siteCopy/heroCopyDefaults';
import type { MergedHeroSiteCopy } from '@/lib/siteCopy/heroCopyDefaults';

export const metadata = {
  title: {
    default: '태자월드',
    template: '%s | 태자월드',
  },
  description: '태국 교민 커뮤니티 태자월드',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml', sizes: '48x48' }],
  },
  verification: {
    other: {
      'naver-site-verification': 'a5e68e7ff5120e3afa1c6c2c5c49d59e193760bb',
    },
  },
};

async function loadHeroSiteCopy(): Promise<MergedHeroSiteCopy> {
  try {
    return await fetchMergedHeroSiteCopy();
  } catch {
    return getMergedDefaultsFromI18n();
  }
}

export default async function RootLayout({ children }: { children: unknown }) {
  const initialLocale = await getLocale();
  const heroSiteCopy = await loadHeroSiteCopy();

  return (
    <html lang="ko" className="overflow-x-hidden">
      <body
        className="flex min-h-screen flex-col overflow-x-hidden bg-[#0B0F19] text-slate-200"
        data-tj-layout="providers-globalnav"
      >
        <Providers heroSiteCopy={heroSiteCopy} initialLocale={initialLocale}>
          <GlobalNavErrorBoundary>
            <GlobalNav />
          </GlobalNavErrorBoundary>

          <main className="min-h-0 w-full flex-1 overflow-x-hidden">
            {children as import('react').ReactNode}
          </main>

          <footer className="mt-auto border-t border-white/10 bg-[#060814] px-4 py-6 text-center text-[11px] text-slate-500">
            <nav className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label="약관·안내">
              <Link href="/terms" className="text-slate-400 no-underline hover:text-white hover:underline">
                이용약관
              </Link>
              <Link href="/privacy" className="text-slate-400 no-underline hover:text-white hover:underline">
                개인정보
              </Link>
              <Link href="/contact" className="text-slate-400 no-underline hover:text-white hover:underline">
                문의
              </Link>
            </nav>
            <p className="m-0">&copy; 2026 태자월드</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
