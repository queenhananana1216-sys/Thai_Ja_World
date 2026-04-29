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
function HomeShellFallback() {
  return (
    <main className="min-h-[120vh] bg-slate-900 px-4 py-6 text-slate-200" data-tj-hub="2026-fallback">
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-5 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">2026 Taeja World</p>
          <h1 className="mt-2 text-xl font-bold">고밀도 3열 포털 복구 모드</h1>
          <p className="mt-2 text-sm text-slate-300">일시적으로 데이터가 없어도 홈 UI는 항상 렌더링됩니다.</p>
        </section>
        <section className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-5 backdrop-blur">
          <p className="text-sm text-slate-300">좌측/중앙/우측 레이아웃 쉘을 유지해 서비스 접근성을 보장합니다.</p>
        </section>
        <section className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-5 backdrop-blur">
          <p className="text-sm text-slate-300">데이터 연결 복구 시 자동으로 실데이터 홈으로 전환됩니다.</p>
        </section>
      </div>
    </main>
  );
}

export default async function HomePage() {
  try {
    return <HomeCommunityShell />;
  } catch (error) {
    console.error('[home] HomeCommunityShell render failed. Fallback shell 렌더링', error);
    return <HomeShellFallback />;
  }
}