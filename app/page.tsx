import Link from 'next/link';

const JOBS = [
  '방콕 통역·매니저 채용 · 월 65만바트 · E-비자 지원',
  '파타야 한식당 주방보조 급구 · 숙식 · 4일 휴무',
  '치앙마이 리모트 디자이너 구인 · 재택 · 계약 6개월',
  '라용 물류센터 한국어 CS 직원 모집 · 교대 근무',
  '아속 한의원 행정직 · 태국어 가능자 우대',
  '푸켓 리조트 프런트 한국어 가능 · 숙소 제공',
  '방콕 스타트업 마케팅 인턴 · TOEIC 800+',
  '콘깬 한인학원 영어강사 · 오후반 우대',
] as const;

const FLEA = [
  '아이폰 15 Pro 256G 미개봉 · 직거래 · 방콕',
  '미사용 에어프라이어 급처 · 오늘만 · Ekkamai',
  '방콕 콘도 가구 일괄 양도 · 즉시 입주 가능',
  '혼다 PCX 160 2024 · 서류 완비 · 라차다',
  '맥북 M3 14인치 · 배터리 사이클 12회',
  '유모차+카시트 세트 · 사용 3개월',
  '에어컨 분리 2대 · 이사 맞춰 인수',
  '전기자전거 접이식 · 배터리 교체 완료',
] as const;

const FREE = [
  '태국 은행 계좌 개설 2026 최신 후기 · SCB·KBang',
  '로컬 병원 영어 진료 가능 리스트 · 방콕·치앙마이',
  '비자 연장 서류 체크리스트 PDF 공유합니다',
  '야시장 숨은 맛집 지도 v4 · GPS 포함',
  '한국에서 태국 이사 컨테이너 견적 비교',
  '태국 운전면허 필기 합격 팁 · 한글 자료',
  '초등 자녀 국제학교 입학 후기 · 방콕',
  '성수기 항공권 알림 봇 사용법 정리',
] as const;

const LOCAL = [
  '방콕 클리닝 특가 · 당일 예약 · 한국어 가능',
  '한국인 원장 치과 · 신규 스케일링 할인',
  '한식 도시락 정기배송 · 주 5회 · OnNut',
  '이사·짐보관 원스톱 · 견적 무료',
  '태국 법무 상담 · 계약서 검토 한글',
  '반려동물 병원 24h · 마이크로칩 등록 대행',
  '세탁·드라이 24h 픽업 · 수쿰윗',
  '한인 미용실 예약 · 남/녀 디자이너',
] as const;

const NEWS = [
  '실시간 환율 · THB/KRW · 오늘 장 브리핑',
  '방콕 BTS 구간 연장 공사 · 우회로 안내',
  '태국 취업비자 심사 체크포인트 업데이트',
  '푸켓 성수기 숙소 예약률 · 대안 지역',
  '우기 대비 침수 지도 · 피난 앱 링크',
  '한-태 관광객 증가 통계 · 2026 Q1',
] as const;

const LIVE_FEED = [
  '실시간: BTS 역세권 원룸 임대 문의 급증',
  '공지: 태국 생활 필수앱 프로모션 모음',
  '속보: 주말 고속도로 통행료 할인 구간',
  '인기: 첫 태국 정착 체크리스트 2026',
  '추천: 비자·보험·은행 한 페이지 정리',
  '현장: 파타야 야시장 주차·환전 팁',
  '정보: 이사 성수기 계약 유의사항',
  '트렌드: 로컬 배달앱 신규 쿠폰 코드',
  'Q&A: DTAC vs AIS 선불 유심 비교',
  '모임: 방콕 북클럽 이번 주 토요일',
  '알림: 한인회 봉사활동 접수 마감 임박',
  '후기: 치앙마이 코워킹 스페이스 한 달 체험',
] as const;

const BOARDS = [
  { title: '구인구직', moreHref: '/community/boards?cat=job', items: JOBS },
  { title: '번개장터', moreHref: '/community/boards?cat=flea', items: FLEA },
  { title: '자유게시판', moreHref: '/community/boards?cat=free', items: FREE },
  { title: '로컬 업체', moreHref: '/local', items: LOCAL },
  { title: '태국 뉴스', moreHref: '/news', items: NEWS },
] as const;

const STICKY_TOP = '5.5rem';

export default function HomePage() {
  return (
    <main
      className="min-h-screen bg-[#0B0F19] px-1.5 py-2 text-slate-200"
      data-tj-root="portal-2026-hardcoded"
    >
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-2 xl:grid-cols-[minmax(10rem,12rem)_minmax(0,1fr)_minmax(11rem,14rem)]">
        {/* Left wing — sticky */}
        <aside className="hidden xl:block">
          <div className="sticky space-y-2" style={{ top: STICKY_TOP }}>
            <section className="rounded-xl border border-blue-300/30 bg-slate-900/55 p-2.5 backdrop-blur-md">
              <p className="text-[11px] font-black uppercase tracking-wide text-blue-300">Left Wing</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-slate-100">
                방콕 교민 전용 · 이동·배달 쿠폰 모음 (데모)
              </p>
              <ul className="mt-2 space-y-1 text-[10px] leading-tight text-slate-400">
                <li>· 프리미엄 광고 슬롯 A</li>
                <li>· 지역 라이프 가이드</li>
                <li>· 긴급 공지 채널</li>
              </ul>
            </section>
            <section className="rounded-xl border border-amber-300/30 bg-slate-900/55 p-2.5 backdrop-blur-md">
              <p className="text-[11px] font-black text-amber-300">오늘의 숫자</p>
              <p className="mt-1 text-xs text-slate-100">새 글 128 · 접속 2,841 (하드코딩)</p>
            </section>
            <section className="rounded-xl border border-white/10 bg-slate-900/40 p-2 text-[10px] text-slate-400">
              <p className="font-semibold text-slate-300">바로가기</p>
              <ul className="mt-1.5 space-y-1">
                <li>
                  <Link href="/community/boards" className="hover:text-amber-200 hover:underline">
                    광장
                  </Link>
                </li>
                <li>
                  <Link href="/community/trade" className="hover:text-amber-200 hover:underline">
                    중고·알바
                  </Link>
                </li>
                <li>
                  <Link href="/news" className="hover:text-amber-200 hover:underline">
                    뉴스
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </aside>

        {/* Center — high-density boards */}
        <section className="min-w-0 space-y-2">
          <div className="rounded-xl border border-slate-600/60 bg-slate-900/60 p-2.5 backdrop-blur-md">
            <p className="text-xs font-black text-amber-300">2026 Taeja World · 고밀도 포털 (오프라인 데모)</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
              아래 목록은 DB 없이 상수 배열만으로 채웠습니다. Supabase·fetch 호출 없음.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {BOARDS.map((board) => (
              <article
                key={board.title}
                className="rounded-xl border border-slate-600/60 bg-slate-900/55 backdrop-blur-md"
              >
                <header className="flex items-center justify-between gap-2 border-b border-slate-700/70 px-2 py-1.5">
                  <h2 className="text-xs font-black text-slate-100">{board.title}</h2>
                  <Link
                    href={board.moreHref}
                    className="shrink-0 text-[11px] font-bold text-amber-300 hover:underline"
                  >
                    더보기
                  </Link>
                </header>
                <ul className="max-h-[220px] overflow-y-auto px-2 py-1">
                  {(board.items as readonly string[]).map((item) => (
                    <li
                      key={item}
                      className="border-b border-slate-800/90 py-1 text-[11px] leading-snug text-slate-200 last:border-b-0"
                    >
                      <span className="line-clamp-2">{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <section className="rounded-xl border border-slate-600/60 bg-slate-900/55 backdrop-blur-md">
            <header className="border-b border-slate-700/70 px-2 py-1.5 text-xs font-black text-blue-300">
              실시간 커뮤니티 피드 (하드코딩)
            </header>
            <ul className="max-h-[280px] overflow-y-auto px-2 py-1">
              {LIVE_FEED.map((item) => (
                <li
                  key={item}
                  className="border-b border-slate-800/90 py-1 text-[11px] leading-snug text-slate-200 last:border-b-0"
                >
                  <span className="line-clamp-2">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </section>

        {/* Right wing — sticky */}
        <aside className="hidden xl:block">
          <div className="sticky space-y-2" style={{ top: STICKY_TOP }}>
            <section className="rounded-xl border border-blue-300/30 bg-slate-900/55 p-2.5 backdrop-blur-md">
              <p className="text-[11px] font-black text-blue-300">문의 / 제보</p>
              <p className="mt-1 text-xs leading-snug text-slate-100">텔레그램 · 왓츠앱 · 라인 (데모 카피)</p>
            </section>
            <section className="rounded-xl border border-amber-300/30 bg-slate-900/55 p-2.5 backdrop-blur-md">
              <p className="text-[11px] font-black text-amber-300">우측 윙</p>
              <p className="mt-1 text-xs leading-snug text-slate-100">추천 업체 · 배달 · 이사 · 생활 (하드코딩)</p>
            </section>
            <section className="rounded-xl border border-white/10 bg-slate-900/40 p-2 text-[10px] text-slate-400">
              <p className="font-semibold text-slate-300">인기 태그</p>
              <p className="mt-1.5 leading-relaxed">
                #구인구직 #번개장터 #비자 #은행 #파타야 #치앙마이 #로컬맛집
              </p>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}
