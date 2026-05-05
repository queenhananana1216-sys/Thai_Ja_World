import type { Metadata } from 'next';
import { Suspense } from 'react';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';
import ThaiTopupClient from './ThaiTopupClient';

export const metadata: Metadata = {
  title: '타이(THAI) 충전',
  description: trimForMetaDescription('Stripe 카드로 살자 미니홈 상점용 타이(THAI) 포인트를 충전합니다.'),
  alternates: { canonical: absoluteUrl('/wallet/topup') },
  robots: { index: false, follow: true },
};

export default function WalletTopupPage() {
  return (
    <Suspense
      fallback={
        <div className="page-body board-page mx-auto max-w-xl py-10 text-slate-400">불러오는 중…</div>
      }
    >
      <ThaiTopupClient />
    </Suspense>
  );
}
