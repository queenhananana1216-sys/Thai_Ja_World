import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: '태자월드 2026',
  description: '태자월드 2026 하드코딩 포털',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#0B0F19] text-white">
        {children}
      </body>
    </html>
  );
}
