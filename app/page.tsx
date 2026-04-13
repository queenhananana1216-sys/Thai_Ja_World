/**
 * app/page.tsx — 홈 메타만 서버, 본문은 클라이언트에서 Supabase 조회 (SSR 무한 로딩 방지)
 */
import type { Metadata } from 'next';
import HomePageClient from './_components/HomePageClient';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import JsonLd from '@/lib/seo/JsonLd';
import { absoluteUrl } from '@/lib/seo/site';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export async function generateMetadata(): Promise<Metadata> {
  const loc = await getLocale();
  const d = getDictionary(loc);
  const url = absoluteUrl('/');
  return {
    title: d.seo.homeTitle,
    description: d.seo.homeDescription,
    alternates: { canonical: url },
    openGraph: {
      title: d.seo.homeTitle,
      description: d.seo.homeDescription,
      url,
      type: 'website',
      siteName: d.seo.defaultTitle,
      locale: loc === 'th' ? 'th_TH' : 'ko_KR',
    },
    twitter: {
      card: 'summary',
      title: d.seo.homeTitle,
      description: d.seo.homeDescription,
    },
    robots: { index: true, follow: true },
  };
}

export default async function HomePage() {
  const auth = await createServerSupabaseAuthClient();
  const loc = await getLocale();
  const d = getDictionary(loc);
  const url = absoluteUrl('/');
  const {
    data: { user },
  } = await auth.auth.getUser();

  // 커뮤니티 통계 (10분 캐시)
  const statsRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/stats`, {
    next: { revalidate: 600 },
  }).catch(() => null);
  const stats = statsRes?.ok ? await statsRes.json() : { memberCount: 0, postCount: 0, spotCount: 0, newsCount: 0 };
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: d.seo.defaultTitle,
          url,
          inLanguage: loc,
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: d.seo.defaultTitle,
          url,
        }}
      />
      <HomePageClient isLoggedIn={!!user} stats={stats} />
    </>
  );
}
