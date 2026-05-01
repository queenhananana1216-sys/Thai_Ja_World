import type { Metadata } from 'next';
import Portal2026View from './portal/Portal2026View';
import {
  fetchPortalHomeFeed,
  HONEST_EMPTY_PORTAL_HOME_FEED,
} from './lib/home/fetchPortalHomeFeed';
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
 * 메인 컨트롤러 — `fetchPortalHomeFeed()`(anon)만 사용. 예외 시에도 빈 피드로 포털 렌더(블랙아웃 방지).
 */
export default async function HomePage() {
  try {
    const feed = await fetchPortalHomeFeed();
    return <Portal2026View feed={feed} />;
  } catch {
    return <Portal2026View feed={HONEST_EMPTY_PORTAL_HOME_FEED} />;
  }
}
