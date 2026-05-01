import Link from 'next/link';
import {
  fetchPortalHomeFeed,
  HONEST_EMPTY_PORTAL_HOME_FEED,
  type PortalFeedLine,
  type PortalHomeFeed,
} from '../lib/home/fetchPortalHomeFeed';
import styles from './portal-2026.module.css';

const EMPTY_COPY = '아직 등록된 글이 없습니다. 첫 글의 주인공이 되어보세요!';

function normalizeLines(lines: PortalFeedLine[] | null | undefined): PortalFeedLine[] {
  if (!Array.isArray(lines)) return [];
  return lines.filter((l) => l && typeof l.id === 'string' && typeof l.title === 'string');
}

function EmptyBoardState() {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-8 text-center">
      <p className="text-[11px] font-medium leading-relaxed text-slate-400">{EMPTY_COPY}</p>
    </div>
  );
}

function FeedLineList({ lines }: { lines: PortalFeedLine[] }) {
  const safe = normalizeLines(lines);
  if (safe.length === 0) return <EmptyBoardState />;
  return (
    <ul className="max-h-[220px] overflow-y-auto px-2 py-1">
      {safe.map((item) => (
        <li
          key={item.id}
          className="border-b border-slate-800/90 py-1 text-[11px] leading-snug text-slate-200 last:border-b-0"
        >
          <Link href={item.href || '/community/boards'} className="block hover:text-amber-200">
            <span className="line-clamp-2 font-medium text-slate-100">{item.title}</span>
            {item.subtitle ? (
              <span className="mt-0.5 block line-clamp-1 text-[10px] text-slate-500">{item.subtitle}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LiveFeedList({ lines }: { lines: PortalFeedLine[] }) {
  const safe = normalizeLines(lines);
  if (safe.length === 0) return <EmptyBoardState />;
  return (
    <ul className="max-h-[280px] overflow-y-auto px-2 py-1">
      {safe.map((item) => (
        <li
          key={item.id}
          className="border-b border-slate-800/90 py-1 text-[11px] leading-snug text-slate-200 last:border-b-0"
        >
          <Link href={item.href || '/community/boards'} className="block hover:text-amber-200">
            <span className="line-clamp-2">{item.title}</span>
            {item.subtitle ? (
              <span className="mt-0.5 block line-clamp-1 text-[10px] text-slate-500">{item.subtitle}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * 2026 고밀도 3열 포털 — SSR 전용, 서버에서만 Supabase anon 피드 로드 (fetchPortalHomeFeed).
 */
export default async function Portal2026View() {
  let feed: PortalHomeFeed;
  try {
    const loaded = await fetchPortalHomeFeed();
    feed = loaded && typeof loaded === 'object' ? loaded : HONEST_EMPTY_PORTAL_HOME_FEED;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <div className="p-10 text-red-500 text-xl font-bold bg-black">치명적 에러 발생: {message}</div>
    );
  }

  const jobs = normalizeLines(feed.jobs);
  const market = normalizeLines(feed.market);
  const freeBoard = normalizeLines(feed.freeBoard);
  const qna = normalizeLines(feed.qna);
  const localBiz = normalizeLines(feed.localBiz);
  const news = normalizeLines(feed.news);
  const wingBanners = normalizeLines(feed.wingBanners);
  const liveFeed = normalizeLines(feed.liveFeed);

  const boards = [
    { title: '구인구직', moreHref: '/community/boards?cat=job', lines: jobs },
    { title: '번개장터', moreHref: '/community/boards?cat=flea', lines: market },
    { title: '자유게시판', moreHref: '/community/boards?cat=free', lines: freeBoard },
    { title: '로컬 업체', moreHref: '/local', lines: localBiz },
    { title: '태국 뉴스', moreHref: '/news', lines: news },
    { title: '생활 Q&A', moreHref: '/community/boards?cat=qna', lines: qna },
  ] as const;

  const newsWing = news.slice(0, 6);
  const localWing = localBiz.slice(0, 5);

  return (
    <main className={styles.root} data-tj-root="portal-2026-ssr">
      <div className={styles.grid}>
        <aside className="hidden min-[1181px]:block">
          <div className="sticky space-y-2" style={{ top: 'var(--tj-home-sticky-top, 14rem)' }}>
            <section className="rounded-xl border border-blue-300/30 bg-slate-900/55 p-2.5 backdrop-blur-md">
              <p className="text-[11px] font-black uppercase tracking-wide text-blue-300">스폰서 · 안내</p>
              {wingBanners.length === 0 ? (
                <EmptyBoardState />
              ) : (
                <ul className="mt-2 space-y-2">
                  {wingBanners.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={b.href || '/ads'}
                        className="block rounded-lg border border-white/5 bg-slate-950/30 p-2 text-[10px] leading-tight hover:border-amber-300/30"
                      >
                        <span className="font-semibold text-slate-100">{b.title}</span>
                        {b.subtitle ? <span className="mt-1 block text-slate-500">{b.subtitle}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-xl border border-amber-300/30 bg-slate-900/55 p-2.5 backdrop-blur-md">
              <p className="text-[11px] font-black text-amber-300">커뮤니티 규모</p>
              {feed.siteTotals ? (
                <p className="mt-1 text-xs leading-snug text-slate-100">
                  프로필 약 {feed.siteTotals.profileCount.toLocaleString('ko-KR')} · 공개 글·거래{' '}
                  {feed.siteTotals.communityItemCount.toLocaleString('ko-KR')}
                </p>
              ) : (
                <p className="mt-1 text-[11px] leading-snug text-slate-500">통계를 불러오지 못했습니다.</p>
              )}
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

        <section className="min-w-0 space-y-2">
          <div className="rounded-xl border border-slate-600/60 bg-slate-900/60 p-2.5 backdrop-blur-md">
            <p className="text-xs font-black text-amber-300">2026 Taeja World · 커뮤니티 포털</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
              Supabase 실데이터를 서버에서만 불러옵니다. (SSR · 클라이언트 데이터 페치 없음)
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {boards.map((board) => (
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
                <FeedLineList lines={board.lines} />
              </article>
            ))}
          </div>

          <section className="rounded-xl border border-slate-600/60 bg-slate-900/55 backdrop-blur-md">
            <header className="border-b border-slate-700/70 px-2 py-1.5 text-xs font-black text-blue-300">
              실시간 통합 피드
            </header>
            <LiveFeedList lines={liveFeed} />
          </section>
        </section>

        <aside className="hidden min-[1181px]:block">
          <div className="sticky space-y-2" style={{ top: 'var(--tj-home-sticky-top, 14rem)' }}>
            <section className="rounded-xl border border-blue-300/30 bg-slate-900/55 p-2.5 backdrop-blur-md">
              <p className="text-[11px] font-black text-blue-300">최신 뉴스</p>
              {newsWing.length === 0 ? (
                <EmptyBoardState />
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {newsWing.map((n) => (
                    <li key={n.id}>
                      <Link href={n.href || '/news'} className="block text-[10px] leading-tight text-slate-200 hover:text-amber-200">
                        <span className="line-clamp-2 font-medium">{n.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-xl border border-amber-300/30 bg-slate-900/55 p-2.5 backdrop-blur-md">
              <p className="text-[11px] font-black text-amber-300">로컬 업체</p>
              {localWing.length === 0 ? (
                <EmptyBoardState />
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {localWing.map((l) => (
                    <li key={l.id}>
                      <Link href={l.href || '/local'} className="block text-[10px] leading-tight text-slate-200 hover:text-amber-200">
                        <span className="line-clamp-2 font-medium">{l.title}</span>
                        {l.subtitle ? <span className="mt-0.5 block text-slate-500">{l.subtitle}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-xl border border-white/10 bg-slate-900/40 p-2 text-[10px] text-slate-400">
              <p className="font-semibold text-slate-300">문의</p>
              <p className="mt-1.5 leading-relaxed text-slate-500">
                게시판·업체 등록은 각 메뉴에서 진행됩니다.
              </p>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}
