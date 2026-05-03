import type { Metadata } from 'next';
import { Suspense } from 'react';
import PortalFeedSection from './_components/PortalFeedSection';
import PortalHomeGlassSkeleton from './_components/PortalHomeGlassSkeleton';
import { absoluteUrl } from '@/lib/seo/site';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';

/** 홈 데이터 일부는 `fetch(..., { next: { revalidate: 60 } })`(home-queries)로 Data Cache — 레이아웃 force-dynamic과 병행 */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const url = absoluteUrl('/');
  const ui = await loadSiteUiSettings();
  const title = ui.siteDisplayName;
  const description = '태국에 사는 이웃과 함께 — 광장·로컬·뉴스 허브';
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: title,
      locale: 'ko_KR',
    },
  };
}

/**
 * Suspense 로 페치 구간에 인라인 폴백을 즉시 노출 — 데이터 지연 시 순수 검은 화면처럼 보이는 현상 완화.
 * 실제 페치·예외 처리는 `PortalFeedSection`.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<PortalHomeGlassSkeleton />}>
      <PortalFeedSection />
    </Suspense>
  );
}
