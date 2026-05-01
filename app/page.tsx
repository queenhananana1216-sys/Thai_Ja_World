import type { Metadata } from 'next';
import Portal2026View from './portal/Portal2026View';
import { fetchPortalHomeFeed } from './lib/home/fetchPortalHomeFeed';
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

/** 데이터는 `fetchPortalHomeFeed()` → `home-queries`의 `createPublicAnonClient()` 경로만 사용 */
export default async function HomePage() {
  const feed = await fetchPortalHomeFeed();
  return <Portal2026View feed={feed} />;
}
