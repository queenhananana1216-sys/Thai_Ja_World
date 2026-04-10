import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/lib/tools/defaults';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'taeja-auto',
    template: '%s — taeja-auto',
  },
  description: '태자 월드 운영·도메인 자동화. 공개 링크 웹은 루트(/)에서 제공합니다.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
