import './globals.css';
import GlobalNav from './_components/GlobalNav';
import { SiteFooterFallback } from './_components/SiteFooterFallback';

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
      <body
        className="flex min-h-screen flex-col overflow-x-hidden bg-[#0B0F19] text-slate-200"
        style={{
          margin: 0,
          minHeight: '100vh',
          backgroundColor: '#0b0f19',
          color: '#e2e8f0',
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
        <main className="relative z-0 min-h-[45vh] w-full flex-1 overflow-x-hidden">
          {children as import('react').ReactNode}
        </main>
        <SiteFooterFallback />
      </body>
    </html>
  );
}
