/**
 * app/page.tsx — 홈 메타만 서버, 본문은 클라이언트에서 Supabase 조회 (SSR 무한 로딩 방지)
 */
import type { Metadata } from 'next';
import HomePageClient from './_components/HomePageClient';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export async function generateMetadata(): Promise<Metadata> {
  const loc = await getLocale();
  const d = getDictionary(loc);
  return {
    title: d.seo.homeTitle,
    description: d.seo.homeDescription,
  };
}

export default async function HomePage() {
  const auth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return <HomePageClient isLoggedIn={!!user} />;
}
