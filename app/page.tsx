import type { Metadata } from 'next';
import HomeCommunityShell from './_components/home/HomeCommunityShell';

/** 홈은 항상 최신 DB 스냅샷 우선 (레이아웃·다른 정적 페이지 캐시와 분리) */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '태자월드 - 태국 교민과 로컬 상권을 잇는 No.1 커뮤니티',
  description:
    '태국 사는 한국인과 현지 로컬 비즈니스가 실시간으로 만나는 곳. 구인구직, 부동산, 번개장터, 비자 정보부터 로컬 한인 업체 당일 예약과 QR 제휴까지 태자월드에서 한 번에 해결하세요.',
};

/**
 * 루트 (/) — SaaS형 랜딩 없이 Supabase 실데이터만 쌓는 Philgo식 고밀도 허브.
 * 레이아웃 본문은 `HomeCommunityShell` (RSC + Suspense per 블록).
 */
export default function HomePage() {
  return <HomeCommunityShell />;
}