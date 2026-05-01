import './globals.css';
import GlobalNav from './_components/GlobalNav';
import { SiteFooterFallback } from './_components/SiteFooterFallback';

/** 라우트·Data Cache 무력화 — 프로덕션에서 스테일 HTML 방지 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

export default function RootLayout({ children }: { children: unknown }) {
  return (
    <html lang="ko" className="overflow-x-hidden">
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-[#0B0F19] text-slate-200">
        <GlobalNav />
        <main className="min-h-0 w-full flex-1 overflow-x-hidden">
          {children as import('react').ReactNode}
        </main>
        <SiteFooterFallback />
      </body>
    </html>
  );
}
