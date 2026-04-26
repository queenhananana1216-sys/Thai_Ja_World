import type { Metadata } from 'next';
import HomeCommunityShell from './_components/home/HomeCommunityShell';

/** 홈은 항상 최신 DB 스냅샷 우선 (레이아웃·다른 정적 페이지 캐시와 분리) */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '태자월드 — 실시간 커뮤니티 허브',
  description:
    '구인·번개장터·로컬 업체·뉴스·게시판을 한 화면에. 태국 거주 한국인 커뮤니티의 살아 있는 최신 글과 데이터.',
};

export default function HomePage() {
  return <HomeCommunityShell />;
}
