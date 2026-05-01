import Link from 'next/link';
import type { PortalFeedLine, PortalHomeFeed } from '../lib/home/fetchPortalHomeFeed';
import styles from './portal-2026.module.css';

/** page.tsx 정적 한국어 사전 — Dynamic Dictionary 금지 */
export type Portal2026KoDict = {
  board: {
    empty: string;
    tradeHubTitle: string;
  };
  home: {
    hubBoard: string;
    shopsMore: string;
    portalMastTitle: string;
    portalMastSub: string;
    tag: string;
  };
  footerNav: {
    contact: string;
  };
};

export type Portal2026ViewProps = {
  feed: PortalHomeFeed;
  dict: Portal2026KoDict;
};

function normalizeLines(lines: PortalFeedLine[] | null | undefined): PortalFeedLine[] {
  if (!Array.isArray(lines)) return [];
  return lines.filter((l) => l && typeof l.id === 'string' && typeof l.title === 'string');
}

function EmptyBoardState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-8 text-center">
      <p className="text-[11px] font-medium leading-relaxed text-slate-400">{message}</p>
    </div>
  );
}

function FeedLineList({ lines, emptyMessage }: { lines: PortalFeedLine[]; emptyMessage: string }) {
  const safe = normalizeLines(lines);
  if (safe.length === 0) return <EmptyBoardState message={emptyMessage} />;
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

function LiveFeedList({ lines, emptyMessage }: { lines: PortalFeedLine[]; emptyMessage: string }) {
  const safe = normalizeLines(lines);
  if (safe.length === 0) return <EmptyBoardState message={emptyMessage} />;
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
 * 2026 3열 포털 — feed·dict는 page.tsx(SSR 컨트롤러)에서만 주입. 한국어 고정.
 */
export default function Portal2026View({ feed, dict }: Portal2026ViewProps) {
  const emptyMsg = dict.board.empty;
  const moreLabel =
    dict.home.shopsMore.replace(/\s*→\s*$/, '').replace(/\s*›\s*$/, '').trim() || '더보기';

  const raw = feed ?? ({} as Partial<PortalHomeFeed>);
  const jobs = normalizeLines(raw.jobs);
  const market = normalizeLines(raw.market);
  const freeBoard = normalizeLines(raw.freeBoard);
  const qna = normalizeLines(raw.qna);
  const localBiz = normalizeLines(raw.localBiz);
  const news = normalizeLines(raw.news);
  const wingBanners = normalizeLines(raw.wingBanners);
  const liveFeed = normalizeLines(raw.liveFeed);

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

  const sponsorTitle = '스폰서 · 안내';
  const scaleTitle = '커뮤니티 규모';
  const shortcutTitle = '바로가기';
  const liveFeedTitle = '실시간 통합 피드';
  const newsAsideTitle = '최신 뉴스';
  const localAsideTitle = '로컬 업체';
  const contactTitle = dict.footerNav.contact;
  const contactBody = '게시판·업체 등록은 각 메뉴에서 진행됩니다.';

  const statsUnavailable = '통계를 불러오지 못했습니다.';
  const profileLabel = '프로필';
  const postsLabel = '공개 글·거래';

  const totals = raw.siteTotals;
  const profileCount =
    totals && typeof totals.profileCount === 'number' ? totals.profileCount : null;
  const communityItemCount =
    totals && typeof totals.communityItemCount === 'number' ? totals.communityItemCount : null;

  return (
    <main className={styles.root} data-tj-root="portal-2026-ssr">
      <div className={styles.grid}>
        <aside className="hidden min-[1181px]:block">
          <div className="sticky space-y-2" style={{ top: 'var(--tj-home-sticky-top, 14rem)' }}>
            <section className="rounded-xl border border-blue-300/30 bg-slate-900/55 p-2.5 backdrop-blur-md">
              <p className="text-[11px] font-black uppercase tracking-wide text-blue-300">{sponsorTitle}</p>
              {(wingBanners?.length ?? 0) === 0 ? (
                <EmptyBoardState message={emptyMsg} />
              ) : (
                <ul className="mt-2 space-y-2">
                  {(wingBanners ?? []).map((b) => (
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
              <p className="text-[11px] font-black text-amber-300">{scaleTitle}</p>
              {profileCount != null && communityItemCount != null ? (
                <p className="mt-1 text-xs leading-snug text-slate-100">
                  {profileLabel} 약 {profileCount.toLocaleString('ko-KR')} · {postsLabel}{' '}
                  {communityItemCount.toLocaleString('ko-KR')}
                </p>
              ) : (
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{statsUnavailable}</p>
              )}
            </section>
            <section className="rounded-xl border border-white/10 bg-slate-900/40 p-2 text-[10px] text-slate-400">
              <p className="font-semibold text-slate-300">{shortcutTitle}</p>
              <ul className="mt-1.5 space-y-1">
                <li>
                  <Link href="/community/boards" className="hover:text-amber-200 hover:underline">
                    {dict.home.hubBoard}
                  </Link>
                </li>
                <li>
                  <Link href="/community/trade" className="hover:text-amber-200 hover:underline">
                    {dict.board.tradeHubTitle}
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
            <p className="text-xs font-black text-amber-300">{dict.home.portalMastTitle}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{dict.home.portalMastSub || dict.home.tag}</p>
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
                    {moreLabel}
                  </Link>
                </header>
                <FeedLineList lines={board.lines} emptyMessage={emptyMsg} />
              </article>
            ))}
          </div>

          <section className="rounded-xl border border-slate-600/60 bg-slate-900/55 backdrop-blur-md">
            <header className="border-b border-slate-700/70 px-2 py-1.5 text-xs font-black text-blue-300">
              {liveFeedTitle}
            </header>
            <LiveFeedList lines={liveFeed} emptyMessage={emptyMsg} />
          </section>
        </section>

        <aside className="hidden min-[1181px]:block">
          <div className="sticky space-y-2" style={{ top: 'var(--tj-home-sticky-top, 14rem)' }}>
            <section className="rounded-xl border border-blue-300/30 bg-slate-900/55 p-2.5 backdrop-blur-md">
              <p className="text-[11px] font-black text-blue-300">{newsAsideTitle}</p>
              {newsWing.length === 0 ? (
                <EmptyBoardState message={emptyMsg} />
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
              <p className="text-[11px] font-black text-amber-300">{localAsideTitle}</p>
              {localWing.length === 0 ? (
                <EmptyBoardState message={emptyMsg} />
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
              <p className="font-semibold text-slate-300">{contactTitle}</p>
              <p className="mt-1.5 leading-relaxed text-slate-500">{contactBody}</p>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}
