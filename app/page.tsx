import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';

/** 홈은 항상 최신 DB 스냅샷 우선 (레이아웃·다른 정적 페이지 캐시와 분리) */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: '태자월드 - 태국 교민과 로컬 상권을 잇는 No.1 커뮤니티',
  description:
    '태국 사는 한국인과 현지 로컬 비즈니스가 실시간으로 만나는 곳. 구인구직, 부동산, 번개장터, 비자 정보부터 로컬 한인 업체 당일 예약과 QR 제휴까지 태자월드에서 한 번에 해결하세요.',
};

const jobs = [
  '태국 로컬 식당 구인합니다 - 주방 보조(숙식 제공)',
  '방콕 한인 마트 캐셔 채용 - 주 6일, 오후 근무',
  '치앙마이 카페 바리스타 모집 - 경력자 우대',
  '파타야 마사지숍 리셉션 구인 - 한국어 가능자',
  '온라인 쇼핑몰 CS 직원 모집 - 재택 일부 가능',
  '태국어 통역 아르바이트 - 행사 3일 단기',
];

const market = [
  '방콕 콘도 양도합니다 - 아속역 도보 5분',
  '중고 아이폰 14 Pro 판매 - 상태 A급',
  '태국 전기밥솥 급처 - 귀국 정리',
  '치앙마이 오토바이 매매 - 서류 완비',
  '골프채 세트 팝니다 - 캘러웨이 정품',
  '아기용품 묶음 나눔 - 직접 픽업',
];

const freeBoard = [
  '방콕 비자 연장 최근 후기 공유합니다',
  '송크란 기간 교통 통제 구간 정리',
  '태국 은행 계좌 개설 질문 있어요',
  '한인 축구 모임 신규 멤버 받습니다',
  '치앙마이 우기 대비 집 관리 팁',
  '태국 병원 응급실 이용 경험담',
];

const localBiz = [
  '스쿰빗 한국어 가능 치과 - 당일 예약 가능',
  '방콕 에어컨 청소 업체 - 주말 출동',
  '파타야 이사 전문 - 박스 포장 포함',
  '치앙마이 차량 렌트 - 장기 할인',
  '태국 세무/법무 상담 - 한국어 대응',
  '한국 식자재 도매 - 레스토랑 납품',
];

const news = [
  '오늘의 뉴스: 방콕 대중교통 신규 노선 발표',
  '오늘의 뉴스: 태국 관광청, 지역 축제 일정 공개',
  '오늘의 뉴스: 환율 변동성 확대, 송금 타이밍 주의',
  '오늘의 뉴스: 치앙마이 미세먼지 지수 개선',
  '오늘의 뉴스: 태국 내 한류 페스티벌 개최 확정',
  '오늘의 뉴스: 중소 상공인 대상 디지털 지원 확대',
];

/** 루트(/) 실경로: app/page.tsx — 2026 포털 강제 고정 */
export default function HomePage() {
  noStore();
  return (
    <main className="min-h-screen bg-[#0B0F19] text-slate-100">
      <div className="mx-auto max-w-[1600px] px-2 pb-6 pt-4">
        <div className="grid grid-cols-12 gap-2">
          <aside className="col-span-2 hidden xl:block">
            <div className="sticky top-22 space-y-2">
              <section className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider text-blue-300">Left Wing</p>
                <h2 className="mt-1 text-sm font-semibold text-yellow-300">프리미엄 배너</h2>
                <ul className="mt-2 space-y-1 text-xs text-slate-200/90">
                  <li>태국 정착 가이드 패키지</li>
                  <li>방콕 병원 통역 원스톱</li>
                  <li>교민 전용 세금 컨설팅</li>
                  <li>실시간 생활 민원 상담</li>
                </ul>
              </section>
              <section className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider text-blue-300">Hot Event</p>
                <h3 className="mt-1 text-sm font-semibold text-yellow-300">2026 멤버십 오픈</h3>
                <p className="mt-2 text-xs text-slate-200/90">
                  광고비 절감 + 상단 고정 노출 + 알림 발송을 한 번에.
                </p>
              </section>
            </div>
          </aside>

          <section className="col-span-12 xl:col-span-8">
            <header className="mb-2 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-widest text-blue-300">2026 Taeja World</p>
              <h1 className="text-lg font-bold text-slate-50">초고밀도 교민 생활 포털 대시보드</h1>
              <p className="text-xs text-slate-300">
                구인구직, 장터, 커뮤니티, 로컬업체, 뉴스를 한 화면에서 즉시 확인
              </p>
            </header>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Board title="구인구직" accent="text-blue-300" items={jobs} />
              <Board title="번개장터" accent="text-yellow-300" items={market} />
              <Board title="자유게시판" accent="text-blue-300" items={freeBoard} />
              <Board title="로컬 업체" accent="text-yellow-300" items={localBiz} />
              <div className="md:col-span-2">
                <Board title="오늘의 뉴스" accent="text-blue-300" items={news} />
              </div>
            </div>
          </section>

          <aside className="col-span-2 hidden xl:block">
            <div className="sticky top-22 space-y-2">
              <section className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider text-blue-300">Right Wing</p>
                <h2 className="mt-1 text-sm font-semibold text-yellow-300">실시간 인기 키워드</h2>
                <ul className="mt-2 space-y-1 text-xs text-slate-200/90">
                  <li>#방콕콘도양도</li>
                  <li>#치앙마이구인</li>
                  <li>#비자연장후기</li>
                  <li>#한인업체추천</li>
                </ul>
              </section>
              <section className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider text-blue-300">Notice</p>
                <h3 className="mt-1 text-sm font-semibold text-yellow-300">운영 공지</h3>
                <p className="mt-2 text-xs text-slate-200/90">
                  모든 섹션은 현재 하드코딩 목업으로 안정 렌더링을 우선 적용했습니다.
                </p>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Board({
  title,
  accent,
  items,
}: {
  title: string;
  accent: string;
  items: string[];
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-md">
      <div className="mb-1 flex items-center justify-between">
        <h2 className={`text-sm font-semibold ${accent}`}>{title}</h2>
        <span className="text-[10px] text-slate-400">LIVE</span>
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item}
            className="truncate rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-200"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}