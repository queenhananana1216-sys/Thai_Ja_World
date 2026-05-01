import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import KoreanBizHubClient, { type KoreanBizRow } from './KoreanBizHubClient';
import { getLocale } from '@/i18n/get-locale';
import { createServerClient } from '@/lib/supabase/server';
import { absoluteUrl } from '@/lib/seo/site';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const META = {
  title: '한인 생활망 — 마트·약국·병원 | 태국에, 살자',
  description: '방콕·파타야·치앙마이 한인 마트, 약국, 병원 연락처. 검증 시각을 함께 표시합니다.',
} as const;

export function generateMetadata(): Metadata {
  const url = absoluteUrl('/korean-biz');
  return {
    title: META.title,
    description: META.description,
    alternates: { canonical: url },
    openGraph: {
      title: META.title,
      description: META.description,
      url,
      type: 'website',
      locale: 'ko_KR',
    },
  };
}

export default async function KoreanBizPage() {
  noStore();
  const locale = await getLocale();
  const sb = createServerClient();
  const { data, error } = await sb
    .from('korean_businesses')
    .select(
      'id, google_place_id, name, category, region, address, phone, latitude, longitude, is_verified, last_verified_at',
    )
    .order('name');

  const rows: KoreanBizRow[] = Array.isArray(data) ? (data as KoreanBizRow[]) : [];
  const globalEmpty = rows.length === 0;

  return (
    <div className="min-h-[70vh] bg-[#060a12] bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.08),_transparent_55%)]">
      <KoreanBizHubClient rows={rows} locale={locale} globalEmpty={globalEmpty} fetchError={Boolean(error)} />
    </div>
  );
}
