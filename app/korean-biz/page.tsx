import type { Metadata } from 'next';
import KoreanBizHubClient, { type KoreanBizRow } from './KoreanBizHubClient';
import { getLocale } from '@/i18n/get-locale';
import { createServerClient } from '@/lib/supabase/server';
import { absoluteUrl } from '@/lib/seo/site';

export const dynamic = 'force-dynamic';

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
  const locale = await getLocale();
  const sb = createServerClient();
  const { data, error } = await sb
    .from('korean_businesses')
    .select(
      'id, google_place_id, name, category, region, address, phone, latitude, longitude, is_verified, last_verified_at',
    )
    .order('name');

  const rows: KoreanBizRow[] = !error && Array.isArray(data) ? (data as KoreanBizRow[]) : [];

  return (
    <div className="min-h-[70vh] bg-[#060a12] bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.08),_transparent_55%)]">
      {error ? (
        <p className="px-4 py-16 text-center text-rose-200">
          목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : (
        <KoreanBizHubClient rows={rows} locale={locale} />
      )}
    </div>
  );
}
