import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/lib/tools/defaults';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '링크정거장 · taeja-auto',
    template: '%s · 링크정거장',
  },
  description:
    '링크정거장(Link Station) — taeja-auto 링크 허브. 자주 쓰는 출구를 한 화면에 모아 둡니다.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
