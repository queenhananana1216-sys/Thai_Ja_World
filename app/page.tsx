import type { Metadata } from 'next';
import { Suspense } from 'react';
import PortalFeedSection from './_components/PortalFeedSection';
import PortalHomeSuspenseFallback from './_components/PortalHomeSuspenseFallback';
import { absoluteUrl } from '@/lib/seo/site';

/** 홈(/)만 SSR 데이터 페치 — 레이아웃은 정적 뼈대 유지 */
export const dynamic = 'force-dynamic';

const HOME_METADATA = {
  title: '태자월드',
  description: '태국 교민 커뮤니티 태자월드 — 광장·로컬·뉴스 허브',
  siteName: '태자월드',
} as const;

export function generateMetadata(): Metadata {
  const url = absoluteUrl('/');
  return {
    title: HOME_METADATA.title,
    description: HOME_METADATA.description,
    alternates: { canonical: url },
    openGraph: {
      title: HOME_METADATA.title,
      description: HOME_METADATA.description,
      url,
      type: 'website',
      siteName: HOME_METADATA.siteName,
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
    <Suspense fallback={<PortalHomeSuspenseFallback />}>
      <PortalFeedSection />
    </Suspense>
  );
}
