import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/lib/tools/defaults';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_AUTO_SITE_URL || `https://${process.env.VERCEL_URL || 'localhost:3010'}`),
  title: {
    default: '링크정거장 · taeja-auto',
    template: '%s · 링크정거장',
  },
  description:
    '링크정거장(Link Station) — taeja-auto 링크 허브. 자주 쓰는 출구를 한 화면에 모아 둡니다.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
