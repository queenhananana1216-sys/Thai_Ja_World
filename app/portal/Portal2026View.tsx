const FALLBACK_BOARDS = [
    {
      title: '구인구직',
      items: [
        '방콕 통역 매니저 채용 · 월 65만바트',
        '파타야 한식당 주방보조 급구 · 숙식 제공',
        '치앙마이 리모트 디자이너 구인 · 재택 가능',
        '라용 물류센터 한국어 CS 직원 모집',
      ],
    },
    {
      title: '번개장터',
      items: [
        '아이폰 15 Pro 256G 상태A · 직거래',
        '미사용 에어프라이어 급처 · 오늘만',
        '방콕 콘도 가구 일괄 양도 · 즉시 입주',
        '혼다 PCX 160 판매 · 서류 완비',
      ],
    },
    {
      title: '자유게시판',
      items: [
        '태국 은행 계좌 개설 최신 후기 정리',
        '로컬 병원 영어 진료 가능한 곳 추천',
        '비자 연장 서류 체크리스트 공유합니다',
        '야시장 숨은 맛집 지도 업데이트',
      ],
    },
    {
      title: '로컬 업체',
      items: [
        '방콕 클리닝 특가 · 당일 예약 가능',
        '한국인 원장 치과 · 신규 할인 이벤트',
        '한식 도시락 정기배송 · 주 5회',
        '이사/짐보관 원스톱 서비스 오픈',
      ],
    },
    {
      title: '태국 뉴스',
      items: [
        '실시간 환율 변동 · 오늘 장 마감 브리핑',
        '방콕 교통 통제 일정 · 주말 우회로 안내',
        '태국 취업비자 심사 체크포인트 업데이트',
        '푸켓 성수기 숙소 예약률 급등 리포트',
      ],
    },
    {
      title: '생활 Q&A',
      items: [
        '현지 계좌 개설 시 필요한 서류 정리',
        '국제운전면허 + 태국 로컬 면허 병행 팁',
        '가성비 좋은 통신사 요금제 추천',
        '자녀 국제학교 입학 절차 경험담',
      ],
    },
];

const FALLBACK_FEED = [
    '실시간: BTS 역세권 원룸 임대 문의 폭주',
    '공지: 태국 생활 필수앱 프로모션 업데이트',
    '속보: 주말 교통 통제 구간 지도 공유',
    '인기: 첫 태국 정착 체크리스트 2026판',
    '추천: 비자/보험/은행 계정 한 번에 정리',
    '현장: 파타야 야시장 주차팁 총정리',
    '정보: 태국 이사 성수기 계약 유의사항',
    '트렌드: 로컬 배달앱 신규 할인코드 모음',
];

function normalizeBoards() {
  const source = Array.isArray(FALLBACK_BOARDS) ? FALLBACK_BOARDS : [];
  return source.map((board) => ({
    title: typeof board?.title === 'string' && board.title.trim() ? board.title : '커뮤니티',
    items: Array.isArray(board?.items)
      ? board.items.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      : [],
  }));
}

function normalizeFeed() {
  const source = Array.isArray(FALLBACK_FEED) ? FALLBACK_FEED : [];
  return source.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function Portal2026ViewBody() {
  const boards = normalizeBoards();
  const feed = normalizeFeed();

  return (
    <main className="min-h-[120vh] bg-[#0B0F19] px-1.5 py-2 text-slate-200" data-tj-root="portal-2026">
      <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-2 min-[1181px]:grid-cols-[minmax(9.25rem,11.5rem)_minmax(0,1fr)_minmax(12.25rem,14.75rem)]">
        <aside className="hidden min-[1181px]:block">
          <div className="sticky space-y-2" style={{ top: 'var(--tj-home-sticky-top, 5.5rem)' }}>
            <section className="rounded-xl border border-blue-300/30 bg-slate-900/55 p-2 backdrop-blur-md">
              <p className="text-[11px] font-black text-blue-300">좌측 윙 배너</p>
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
            <p className="mt-1 text-[11px] text-slate-300">DB와 무관하게 루트(/)에서 2026 고밀도 3열 포털을 강제 렌더링합니다.</p>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {(boards ?? []).map((board) => (
              <article
                key={board.title}
                className="rounded-xl border border-slate-600/60 bg-slate-900/55 backdrop-blur-md"
              >
                <header className="flex items-center justify-between border-b border-slate-700/70 px-2 py-1">
                  <h2 className="text-xs font-black text-slate-100">{board.title}</h2>
                  <span className="text-[11px] font-bold text-amber-300">더보기</span>
                </header>
                <ul className="px-2 py-1">
                  {(board.items ?? []).map((item) => (
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
              {(feed ?? []).map((item) => (
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
              <p className="text-[11px] font-black text-amber-300">우측 윙 배너</p>
              <p className="mt-1 text-xs text-slate-100">오늘의 추천 업체 · 배달/이동/생활</p>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function Portal2026View() {
  try {
    return <Portal2026ViewBody />;
  } catch (error) {
    console.error('[portal-2026] SSR render failed; fallback body forced', error);
    return (
      <main className="min-h-screen bg-[#0B0F19] px-2 py-3 text-slate-200" data-tj-root="portal-2026-failsafe">
        <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-2 min-[1181px]:grid-cols-[minmax(9.25rem,11.5rem)_minmax(0,1fr)_minmax(12.25rem,14.75rem)]">
          <aside className="hidden min-[1181px]:block">
            <div className="sticky space-y-2" style={{ top: 'var(--tj-home-sticky-top, 5.5rem)' }}>
              <section className="rounded-xl border border-blue-300/30 bg-slate-900/55 p-2 backdrop-blur-md">
                <p className="text-[11px] font-black text-blue-300">좌측 윙 배너</p>
                <p className="mt-1 text-xs text-slate-100">구인구직 · 번개장터 · 실시간 통계</p>
              </section>
            </div>
          </aside>
          <section className="rounded-xl border border-slate-600/60 bg-slate-900/55 p-2 backdrop-blur-md">
            <h1 className="text-xs font-black text-amber-300">2026 고밀도 3열 포털 안전 모드</h1>
            <p className="mt-1 text-[11px] text-slate-100">구인구직 / 번개장터 / 자유게시판 / 로컬 업체</p>
            <p className="text-[11px] text-slate-100">실시간 커뮤니티 피드 · 스티키 윙 · 글래스모피즘</p>
          </section>
          <aside className="hidden min-[1181px]:block">
            <div className="sticky space-y-2" style={{ top: 'var(--tj-home-sticky-top, 5.5rem)' }}>
              <section className="rounded-xl border border-amber-300/30 bg-slate-900/55 p-2 backdrop-blur-md">
                <p className="text-[11px] font-black text-amber-300">우측 윙 배너</p>
                <p className="mt-1 text-xs text-slate-100">문의/제보 · 추천 업체 · 생활 정보</p>
              </section>
            </div>
          </aside>
        </div>
      </main>
    );
  }
}
