import type { Metadata } from 'next';
import Portal2026View from './portal/Portal2026View';
import {
  fetchPortalHomeFeed,
  HONEST_EMPTY_PORTAL_HOME_FEED,
  type PortalHomeFeed,
} from './lib/home/fetchPortalHomeFeed';
import type { Portal2026KoDict } from './portal/Portal2026View';
import { absoluteUrl } from '@/lib/seo/site';

/** 로케일 고정 — getLocale·getDictionary·쿠키·헤더 미사용 */
const LOCALE = 'ko' as const;

const PORTAL_2026_KO_DICT: Portal2026KoDict = {
  board: {
    empty: '아직 등록된 글이 없습니다. 첫 글의 주인공이 되어보세요!',
    tradeHubTitle: '중고·알바',
  },
  home: {
    hubBoard: '광장',
    shopsMore: '더 보기 →',
    portalMastTitle: '2026 Taeja World · 커뮤니티 포털',
    portalMastSub: 'Supabase 공개 데이터를 서버에서만 불러옵니다. (SSR)',
    tag: '태국 교민 커뮤니티 태자월드',
  },
  footerNav: {
    contact: '문의',
  },
};

const HOME_METADATA = {
  title: '태자월드',
  description: `태국 교민 커뮤니티 태자월드 (${LOCALE}) — 광장·로컬·뉴스 허브`,
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
  try {
    const loaded = await fetchPortalHomeFeed();
    const feed: PortalHomeFeed =
      loaded && typeof loaded === 'object' ? loaded : HONEST_EMPTY_PORTAL_HOME_FEED;

    return <Portal2026View feed={feed} dict={PORTAL_2026_KO_DICT} />;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <div className="bg-black p-10 text-xl font-bold text-red-500">치명적 에러 발생: {message}</div>
    );
  }
}
