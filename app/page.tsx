import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { fetchPortalHomeFeed, type PortalFeedLine } from './lib/home/fetchPortalHomeFeed';

/** 홈은 항상 최신 DB 스냅샷 우선 (레이아웃·다른 정적 페이지 캐시와 분리) */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: '태자월드 - 태국 교민과 로컬 상권을 잇는 No.1 커뮤니티',
  description:
    '태국 사는 한국인과 현지 로컬 비즈니스가 실시간으로 만나는 곳. 구인구직, 부동산, 번개장터, 비자 정보부터 로컬 한인 업체 당일 예약과 QR 제휴까지 태자월드에서 한 번에 해결하세요.',
};

export default async function HomePage() {
  noStore();
  let feed = {
    jobs: [] as PortalFeedLine[],
    market: [] as PortalFeedLine[],
    freeBoard: [] as PortalFeedLine[],
    localBiz: [] as PortalFeedLine[],
    news: [] as PortalFeedLine[],
    wingBanners: [] as PortalFeedLine[],
  };
  try {
    feed = await fetchPortalHomeFeed();
  } catch {
    /* fetchPortalHomeFeed 내부에서 이미 구역별 방어 — 이중 안전 */
  }

  const jobs = feed.jobs ?? [];
  const market = feed.market ?? [];
  const freeBoard = feed.freeBoard ?? [];
  const localBiz = feed.localBiz ?? [];
  const news = feed.news ?? [];
  const wingBanners = feed.wingBanners ?? [];

  return (
    <main className="min-h-screen bg-[#0B0F19] text-slate-100">
      <div className="mx-auto max-w-[1600px] px-2 pb-6 pt-4">
        <div className="grid grid-cols-12 gap-2">
          <aside className="col-span-2 hidden xl:block">
            <div className="sticky top-22 space-y-2">
              <section className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider text-blue-300">Left Wing</p>
                <h2 className="mt-1 text-sm font-semibold text-yellow-300">프리미엄 · 사이드</h2>
                {(wingBanners?.length ?? 0) > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-200/90">
                    {(wingBanners ?? []).map((b) => (
                      <li key={b.id}>
                        <Link
                          href={b.href || '/ads'}
                          className="text-slate-200/90 underline-offset-2 hover:text-white hover:underline"
                        >
                          {b.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">
                    등록된 사이드 배너가 없습니다.{' '}
                    <Link href="/ads" className="text-blue-300 hover:underline">
                      광고 안내
                    </Link>
                  </p>
                )}
              </section>
              <section className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider text-blue-300">바로가기</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>
                    <Link href="/community/boards" className="text-slate-200/90 hover:text-white hover:underline">
                      광장
                    </Link>
                  </li>
                  <li>
                    <Link href="/community/trade" className="text-slate-200/90 hover:text-white hover:underline">
                      중고·알바
                    </Link>
                  </li>
                  <li>
                    <Link href="/local" className="text-slate-200/90 hover:text-white hover:underline">
                      로컬
                    </Link>
                  </li>
                  <li>
                    <Link href="/news" className="text-slate-200/90 hover:text-white hover:underline">
                      뉴스
                    </Link>
                  </li>
                </ul>
              </section>
            </div>
          </aside>

          <section className="col-span-12 xl:col-span-8">
            <header className="mb-2 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-widest text-blue-300">2026 Taeja World</p>
              <h1 className="text-lg font-bold text-slate-50">초고밀도 교민 생활 포털 대시보드</h1>
              <p className="text-xs text-slate-300">
                구인구직, 장터, 커뮤니티, 로컬업체, 뉴스 — Supabase 실데이터 연동
              </p>
            </header>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Board
                title="구인구직"
                accent="text-blue-300"
                moreHref="/community/boards?cat=job"
                lines={jobs}
                emptyHint="첫 글의 주인공이 되어보세요!"
              />
              <Board
                title="번개장터"
                accent="text-yellow-300"
                moreHref="/community/boards?cat=flea"
                lines={market}
                emptyHint="첫 글의 주인공이 되어보세요!"
              />
              <Board
                title="자유게시판"
                accent="text-blue-300"
                moreHref="/community/boards?cat=free"
                lines={freeBoard}
                emptyHint="첫 글의 주인공이 되어보세요!"
              />
              <Board
                title="로컬 업체"
                accent="text-yellow-300"
                moreHref="/local"
                lines={localBiz}
                emptyHint="로컬 가게가 곧 채워집니다."
              />
              <div className="md:col-span-2">
                <Board
                  title="오늘의 뉴스"
                  accent="text-blue-300"
                  moreHref="/news"
                  lines={news}
                  emptyHint="뉴스가 준비되면 여기에 표시됩니다."
                />
              </div>
            </div>
          </section>

          <aside className="col-span-2 hidden xl:block">
            <div className="sticky top-22 space-y-2">
              <section className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider text-blue-300">Right Wing</p>
                <h2 className="mt-1 text-sm font-semibold text-yellow-300">실시간 인기</h2>
                <ul className="mt-2 space-y-1 text-xs text-slate-200/90">
                  <li>
                    <Link href="/community/boards?cat=job" className="hover:text-white hover:underline">
                      #구인구직
                    </Link>
                  </li>
                  <li>
                    <Link href="/community/boards?cat=flea" className="hover:text-white hover:underline">
                      #번개장터
                    </Link>
                  </li>
                  <li>
                    <Link href="/community/boards?cat=free" className="hover:text-white hover:underline">
                      #자유게시판
                    </Link>
                  </li>
                  <li>
                    <Link href="/local" className="hover:text-white hover:underline">
                      #로컬
                    </Link>
                  </li>
                </ul>
              </section>
              <section className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider text-blue-300">Notice</p>
                <h3 className="mt-1 text-sm font-semibold text-yellow-300">DB 연동</h3>
                <p className="mt-2 text-xs text-slate-200/90">
                  본 페이지는 Supabase의 jobs, market, posts, 로컬 뷰, processed_news에서 불러옵니다.
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
  lines,
  emptyHint,
  moreHref,
}: {
  title: string;
  accent: string;
  lines: PortalFeedLine[];
  emptyHint: string;
  moreHref: string;
}) {
  const safe = Array.isArray(lines) ? lines : [];
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-md">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className={`text-sm font-semibold ${accent}`}>{title}</h2>
        <Link href={moreHref} className="shrink-0 text-[10px] text-blue-300 hover:underline">
          더보기
        </Link>
      </div>
      {safe.length === 0 ? (
        <p className="rounded-md border border-dashed border-white/15 bg-black/20 px-2 py-3 text-center text-xs text-slate-400">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-1">
          {safe.map((item) => (
            <li
              key={item.id}
              className="truncate rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-200"
            >
              <Link href={item.href || '#'} className="font-medium text-slate-100 hover:text-amber-200 hover:underline">
                {item.title}
              </Link>
              {item.subtitle ? (
                <span className="ml-1 text-[10px] text-slate-500">· {item.subtitle}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
