import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';
import PremiumLoungeClient from './PremiumLoungeClient';

export const metadata: Metadata = {
  title: '프리미엄 라운지',
  description: trimForMetaDescription('태자월드 프리미엄 구독 — 스폰서 배너, 광고 없는 미니홈 등 Stripe 월 구독'),
  alternates: { canonical: absoluteUrl('/premium') },
  openGraph: {
    title: '태자월드 프리미엄 라운지',
    description: trimForMetaDescription('프리미엄 플랜으로 수익·브랜딩 레버를 확장하세요.'),
    url: absoluteUrl('/premium'),
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default async function PremiumPage() {
  const auth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  let initialIsPremium = false;
  let initialPlan: string | null = null;

  if (user) {
    const { data } = await auth.from('profiles').select('is_premium, premium_plan').eq('id', user.id).maybeSingle();
    const row = data as { is_premium?: boolean; premium_plan?: string | null } | null;
    if (row) {
      initialIsPremium = Boolean(row.is_premium);
      initialPlan = typeof row.premium_plan === 'string' && row.premium_plan.trim() ? row.premium_plan.trim() : null;
    }
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050508]" />}>
      <PremiumLoungeClient viewerId={user?.id ?? null} initialIsPremium={initialIsPremium} initialPlan={initialPlan} />
    </Suspense>
  );
}
