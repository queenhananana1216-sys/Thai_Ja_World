import type { Metadata } from 'next';
import Portal2026View from './portal/Portal2026View';
import {
  fetchPortalHomeFeed,
  HONEST_EMPTY_PORTAL_HOME_FEED,
  type PortalHomeFeed,
} from './lib/home/fetchPortalHomeFeed';
import { absoluteUrl } from '@/lib/seo/site';

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

export default async function HomePage() {
  let feed: PortalHomeFeed = HONEST_EMPTY_PORTAL_HOME_FEED;
  try {
    const loaded = await fetchPortalHomeFeed();
    if (loaded && typeof loaded === 'object') feed = loaded;
  } catch {
    feed = HONEST_EMPTY_PORTAL_HOME_FEED;
  }

  return <Portal2026View feed={feed} />;
}
