/**
 * app/page.tsx — 홈 메타만 서버, 본문은 클라이언트에서 Supabase 조회 (SSR 무한 로딩 방지)
 */
import type { Metadata } from 'next';
import HomePageClient from './_components/HomePageClient';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';

export async function generateMetadata(): Promise<Metadata> {
  const loc = await getLocale();
  const d = getDictionary(loc);
  return {
    title: d.seo.homeTitle,
    description: d.seo.homeDescription,
  };
}

export default function HomePage() {
  return <HomePageClient />;
}
