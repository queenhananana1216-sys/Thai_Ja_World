import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: '태자월드',
  description: '태국 교민 커뮤니티 태자월드',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml', sizes: '48x48' }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="overflow-x-hidden">
      <body className="min-h-screen overflow-x-hidden bg-[#0B0F19] text-white">{children}</body>
    </html>
  );
}
