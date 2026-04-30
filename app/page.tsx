import type { Metadata } from 'next';
import HomeCommunityShell from './_components/home/HomeCommunityShell';

/** 홈은 항상 최신 DB 스냅샷 우선 (레이아웃·다른 정적 페이지 캐시와 분리) */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  const mockBoards = [
    {
      title: '구인구직',
      more: '더보기',
      items: [
        '방콕 통역 매니저 채용 · 월 65만바트',
        '파타야 한식당 주방보조 급구 · 숙식 제공',
        '치앙마이 리모트 디자이너 구인 · 재택 가능',
        '라용 물류센터 한국어 CS 직원 모집',
      ],
    },
    {
      title: '번개장터',
      more: '더보기',
      items: [
        '아이폰 15 Pro 256G 상태A · 직거래',
        '미사용 에어프라이어 급처 · 오늘만',
        '방콕 콘도 가구 일괄 양도 · 즉시 입주',
        '혼다 PCX 160 판매 · 서류 완비',
      ],
    },
    {
      title: '자유게시판',
      more: '더보기',
      items: [
        '태국 은행 계좌 개설 최신 후기 정리',
        '로컬 병원 영어 진료 가능한 곳 추천',
        '비자 연장 서류 체크리스트 공유합니다',
        '야시장 숨은 맛집 지도 업데이트',
      ],
    },
    {
      title: '로컬 업체',
      more: '더보기',
      items: [
        '방콕 클리닝 특가 · 당일 예약 가능',
        '한국인 원장 치과 · 신규 할인 이벤트',
        '한식 도시락 정기배송 · 주 5회',
        '이사/짐보관 원스톱 서비스 오픈',
      ],
    },
  ];

  const mockFeed = [
    '실시간: BTS 역세권 원룸 임대 문의 폭주',
    '공지: 태국 생활 필수앱 프로모션 업데이트',
    '속보: 주말 교통 통제 구간 지도 공유',
    '인기: 첫 태국 정착 체크리스트 2026판',
    '추천: 비자/보험/은행 계정 한 번에 정리',
    '현장: 파타야 야시장 주차팁 총정리',
  ];

  return (
    <main className="min-h-[120vh] bg-[#0B0F19] px-1.5 py-2 text-slate-200" data-tj-hub="2026-fallback">
      <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-2 min-[1181px]:grid-cols-[minmax(9.25rem,11.5rem)_minmax(0,1fr)_minmax(12.25rem,14.75rem)]">
        <aside className="hidden min-[1181px]:block">
          <div className="sticky space-y-2" style={{ top: 'var(--tj-home-sticky-top, 5.5rem)' }}>
            <section className="rounded-xl border border-blue-300/30 bg-slate-900/55 p-2 backdrop-blur-md">
              <p className="text-[11px] font-black text-blue-300">프리미엄 배너</p>
              <p className="mt-1 text-xs font-semibold text-slate-100">방콕 교민 전용 이동 쿠폰</p>
            </section>
            <section className="rounded-xl border border-amber-300/30 bg-slate-900/55 p-2 backdrop-blur-md">
              <p className="text-[11px] font-black text-amber-300">실시간 통계</p>
              <p className="mt-1 text-xs text-slate-100">오늘 게시글 187 · 접속자 3,291</p>
            </section>
          </div>
        </aside>

        <section className="space-y-2">
          <div className="rounded-xl border border-slate-600/60 bg-slate-900/60 p-2 backdrop-blur-md">
            <p className="text-xs font-black text-amber-300">통합 검색 · 실시간 키워드 · 프리미엄 배너</p>
            <p className="mt-1 text-[11px] text-slate-300">DB 장애 시에도 루트(/)는 2026 고밀도 3열 UI를 유지합니다.</p>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {mockBoards.map((board) => (
              <article
                key={board.title}
                className="rounded-xl border border-slate-600/60 bg-slate-900/55 backdrop-blur-md"
              >
                <header className="flex items-center justify-between border-b border-slate-700/70 px-2 py-1">
                  <h2 className="text-xs font-black text-slate-100">{board.title}</h2>
                  <span className="text-[11px] font-bold text-amber-300">{board.more}</span>
                </header>
                <ul className="px-2 py-1">
                  {board.items.map((item) => (
                    <li key={item} className="truncate border-b border-slate-800/90 py-1 text-[11px] text-slate-200 last:border-b-0">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <section className="rounded-xl border border-slate-600/60 bg-slate-900/55 backdrop-blur-md">
            <header className="border-b border-slate-700/70 px-2 py-1 text-xs font-black text-blue-300">실시간 커뮤니티 피드</header>
            <ul className="px-2 py-1">
              {mockFeed.map((item) => (
                <li key={item} className="truncate border-b border-slate-800/90 py-1 text-[11px] text-slate-200 last:border-b-0">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </section>

        <aside className="hidden min-[1181px]:block">
          <div className="sticky space-y-2" style={{ top: 'var(--tj-home-sticky-top, 5.5rem)' }}>
            <section className="rounded-xl border border-blue-300/30 bg-slate-900/55 p-2 backdrop-blur-md">
              <p className="text-[11px] font-black text-blue-300">문의/제보</p>
              <p className="mt-1 text-xs text-slate-100">텔레그램 · 왓츠앱 · 라인 즉시 연결</p>
            </section>
            <section className="rounded-xl border border-amber-300/30 bg-slate-900/55 p-2 backdrop-blur-md">
              <p className="text-[11px] font-black text-amber-300">광고 스팟</p>
              <p className="mt-1 text-xs text-slate-100">오늘의 추천 업체 · 배달/이동/생활</p>
            </section>
          </div>
        </aside>
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