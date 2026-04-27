import type { Metadata } from 'next';
import HomeCommunityShell from './_components/home/HomeCommunityShell';

/** 홈은 항상 최신 DB 스냅샷 우선 (레이아웃·다른 정적 페이지 캐시와 분리) */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '태자월드',
  description: '태국 생활의 모든 연결 — 구인·번개·로컬·뉴스·실시간 피드.',
};

/**
 * 루트 (/) — SaaS형 랜딩 없이 Supabase 실데이터만 쌓는 Philgo식 고밀도 허브.
 * 레이아웃 본문은 `HomeCommunityShell` (RSC + Suspense per 블록).
 */
export default function HomePage() {
  return <HomeCommunityShell />;
}