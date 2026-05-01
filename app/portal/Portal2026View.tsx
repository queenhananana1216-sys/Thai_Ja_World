import Link from 'next/link';
import type { PortalFeedLine, PortalHomeFeed } from '../lib/home/fetchPortalHomeFeed';
import styles from './portal-2026.module.css';

const EMPTY_POST = '아직 등록된 글이 없습니다.';
const EMPTY_WING = '등록된 스폰서·안내 슬롯이 없습니다.';
const EMPTY_NEWS = '최신 뉴스가 아직 없습니다.';
const EMPTY_LOCAL = '등록된 로컬 업체가 아직 없습니다.';

const LABELS = {
  board: {
    empty: EMPTY_POST,
    tradeHubTitle: '중고·알바',
  },
  home: {
    hubBoard: '광장',
    shopsMore: '더 보기 →',
    portalMastTitle: '2026 Taeja World',
    portalMastSub: '태국 교민을 위한 광장·거래·뉴스·로컬 허브',
    tag: '태자월드 커뮤니티',
  },
  footerNav: {
    contact: '문의',
  },
} as const;

export type Portal2026ViewProps = {
  feed: PortalHomeFeed;
};

function safeFeed(input: PortalHomeFeed | null | undefined): PortalHomeFeed {
  if (!input || typeof input !== 'object') {
    return {
      jobs: [],
      market: [],
      freeBoard: [],
      qna: [],
      localBiz: [],
      news: [],
      wingBanners: [],
      liveFeed: [],
      siteTotals: null,
    };
  }
  return {
    jobs: Array.isArray(input.jobs) ? input.jobs : [],
    market: Array.isArray(input.market) ? input.market : [],
    freeBoard: Array.isArray(input.freeBoard) ? input.freeBoard : [],
    qna: Array.isArray(input.qna) ? input.qna : [],
    localBiz: Array.isArray(input.localBiz) ? input.localBiz : [],
    news: Array.isArray(input.news) ? input.news : [],
    wingBanners: Array.isArray(input.wingBanners) ? input.wingBanners : [],
    liveFeed: Array.isArray(input.liveFeed) ? input.liveFeed : [],
    siteTotals:
      input.siteTotals &&
      typeof input.siteTotals === 'object' &&
      typeof input.siteTotals.profileCount === 'number' &&
      typeof input.siteTotals.communityItemCount === 'number'
        ? {
            profileCount: input.siteTotals.profileCount,
            communityItemCount: input.siteTotals.communityItemCount,
          }
        : null,
  };
}

function normalizeLines(lines: PortalFeedLine[] | null | undefined): PortalFeedLine[] {
  if (!Array.isArray(lines)) return [];
  const out: PortalFeedLine[] = [];
  for (const l of lines) {
    if (!l || typeof l !== 'object') continue;
    const idRaw = (l as { id?: unknown }).id;
    const titleRaw = (l as { title?: unknown }).title;
    const id = typeof idRaw === 'string' ? idRaw : idRaw != null ? String(idRaw) : '';
    const title = typeof titleRaw === 'string' ? titleRaw : titleRaw != null ? String(titleRaw) : '';
    if (!id?.trim() || !title?.trim()) continue;
    const hrefRaw = (l as { href?: unknown }).href;
    const subRaw = (l as { subtitle?: unknown }).subtitle;
    out.push({
      id: id.trim(),
      title: title.trim(),
      href: typeof hrefRaw === 'string' && hrefRaw.trim() ? hrefRaw : '/community/boards',
      subtitle:
        typeof subRaw === 'string' ? subRaw : subRaw != null ? String(subRaw) : null,
    });
  }
  return out;
}

function EmptyState({ message }: { message: string }) {
  const text = message?.trim() ? message : EMPTY_POST;
  return (
    <div className={styles.emptyState}>
      <p className="m-0 text-[11px] font-medium leading-relaxed text-slate-400">{text}</p>
    </div>
  );
}

function FeedLineList({ lines, emptyMessage }: { lines: PortalFeedLine[]; emptyMessage: string }) {
  const safe = normalizeLines(lines ?? []);
  if (safe.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <ul className="max-h-[220px] min-h-0 overflow-y-auto overscroll-contain px-2 py-1">
      {safe.map((item, idx) => (
        <li
          key={item?.id ? String(item.id) : `feed-${idx}`}
          className="border-b border-slate-800/90 py-1 text-[11px] leading-snug text-slate-200 last:border-b-0"
        >
          <Link href={item?.href?.trim() ? item.href : '/community/boards'} className="block hover:text-amber-200">
            <span className="line-clamp-2 font-medium text-slate-100">{item?.title ?? ''}</span>
            {item?.subtitle ? (
              <span className="mt-0.5 block line-clamp-1 text-[10px] text-slate-500">{item.subtitle}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LiveFeedList({ lines, emptyMessage }: { lines: PortalFeedLine[]; emptyMessage: string }) {
  const safe = normalizeLines(lines ?? []);
  if (safe.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <ul className="max-h-[280px] min-h-0 overflow-y-auto overscroll-contain px-2 py-1">
      {safe.map((item, idx) => (
        <li
          key={item?.id ? String(item.id) : `live-${idx}`}
          className="border-b border-slate-800/90 py-1 text-[11px] leading-snug text-slate-200 last:border-b-0"
        >
          <Link href={item?.href?.trim() ? item.href : '/community/boards'} className="block hover:text-amber-200">
            <span className="line-clamp-2">{item?.title ?? ''}</span>
            {item?.subtitle ? (
              <span className="mt-0.5 block line-clamp-1 text-[10px] text-slate-500">{item.subtitle}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const BOARD_COLUMNS = [
  { title: '구인구직', moreHref: '/community/boards?cat=job', key: 'job' },
  { title: '번개장터', moreHref: '/community/boards?cat=flea', key: 'flea' },
  { title: '자유게시판', moreHref: '/community/boards?cat=free', key: 'free' },
  { title: '로컬 업체', moreHref: '/local', key: 'local' },
  { title: '태국 뉴스', moreHref: '/news', key: 'news' },
  { title: '생활 Q&A', moreHref: '/community/boards?cat=qna', key: 'qna' },
] as const;

/**
 * 2026 3열 포털 — `feed`는 서버에서 `fetchPortalHomeFeed()`로만 채움(DB 실데이터).
 */
export default function Portal2026View({ feed }: Portal2026ViewProps) {
  const raw = safeFeed(feed);

  const moreLabel =
    LABELS.home.shopsMore.replace(/\s*→\s*$/, '').replace(/\s*›\s*$/, '').trim() || '더보기';

  const jobs = normalizeLines(raw?.jobs ?? []);
  const market = normalizeLines(raw?.market ?? []);
  const freeBoard = normalizeLines(raw?.freeBoard ?? []);
  const qna = normalizeLines(raw?.qna ?? []);
  const localBiz = normalizeLines(raw?.localBiz ?? []);
  const news = normalizeLines(raw?.news ?? []);
  const wingBanners = normalizeLines(raw?.wingBanners ?? []);
  const liveFeed = normalizeLines(raw?.liveFeed ?? []);

  const linesByKey: Record<string, PortalFeedLine[]> = {
    job: jobs,
    flea: market,
    free: freeBoard,
    local: localBiz,
    news,
    qna,
  };

  const newsWing = [...(news ?? [])].slice(0, 6);
  const localWing = [...(localBiz ?? [])].slice(0, 5);

  const sponsorTitle = '스폰서 · 안내';
  const scaleTitle = '커뮤니티 규모';
  const shortcutTitle = '바로가기';
  const liveFeedTitle = '실시간 통합 피드';
  const newsAsideTitle = '최신 뉴스';
  const localAsideTitle = '로컬 업체';
  const contactTitle = LABELS.footerNav.contact;
  const contactBody = '게시판·업체 등록은 각 메뉴에서 진행됩니다.';

  const statsUnavailable = '집계 정보를 불러오지 못했습니다.';
  const profileLabel = '프로필';
  const postsLabel = '공개 글·거래';

  const totals = raw?.siteTotals;
  const profileCount =
    totals && typeof totals.profileCount === 'number' ? totals.profileCount : null;
  const communityItemCount =
    totals && typeof totals.communityItemCount === 'number' ? totals.communityItemCount : null;

  const hubBoardLabel = LABELS.home.hubBoard;
  const tradeLabel = LABELS.board.tradeHubTitle;

  return (
    <main className={styles.root} data-tj-root="portal-2026-ssr">
      <div className={styles.grid}>
        <aside className="hidden min-h-0 min-w-0 min-[1181px]:block">
          <div className={styles.stickyWing}>
            <section className={`${styles.glassBlue} p-2.5`}>
              <p className="text-[11px] font-black uppercase tracking-wide text-blue-300">{sponsorTitle}</p>
              {(wingBanners?.length ?? 0) === 0 ? (
                <EmptyState message={EMPTY_WING} />
              ) : (
                <ul className="mt-2 space-y-2">
                  {(wingBanners ?? []).map((b, i) => {
                    const bid = b?.id != null ? String(b.id) : `wing-${i}`;
                    const title = b?.title != null ? String(b.title).trim() : '';
                    if (!title) return null;
                    const href = b?.href?.trim() ? String(b.href) : '/ads';
                    return (
                      <li key={bid}>
                        <Link
                          href={href}
                          className="block rounded-lg border border-white/5 bg-slate-950/30 p-2 text-[10px] leading-tight hover:border-amber-300/30"
                        >
                          <span className="font-semibold text-slate-100">{title}</span>
                          {b?.subtitle != null && String(b.subtitle).trim() ? (
                            <span className="mt-1 block text-slate-500">{String(b.subtitle)}</span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            <section className={`${styles.glassGold} p-2.5`}>
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
            <section className={`${styles.glassCenter} p-2 text-[10px] text-slate-400`}>
              <p className="font-semibold text-slate-300">{shortcutTitle}</p>
              <ul className="mt-1.5 space-y-1">
                <li>
                  <Link href="/community/boards" className="hover:text-amber-200 hover:underline">
                    {hubBoardLabel}
                  </Link>
                </li>
                <li>
                  <Link href="/community/trade" className="hover:text-amber-200 hover:underline">
                    {tradeLabel}
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

        <section className="min-h-0 min-w-0 space-y-2">
          <div className={`${styles.glassGold} p-2.5`}>
            <p className="text-xs font-black tracking-tight text-amber-300">{LABELS.home.portalMastTitle}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{LABELS.home.portalMastSub}</p>
          </div>

          <div className={`${styles.boardGrid}`}>
            {BOARD_COLUMNS.map((board) => (
              <article key={board.key} className={`${styles.glassCenter} min-w-0 overflow-hidden`}>
                <header className="flex items-center justify-between gap-2 border-b border-slate-700/70 px-2 py-1.5">
                  <h2 className="text-xs font-black text-slate-100">{board.title}</h2>
                  <Link
                    href={board.moreHref ?? '/community/boards'}
                    className="shrink-0 text-[11px] font-bold text-amber-300 hover:underline"
                  >
                    {moreLabel}
                  </Link>
                </header>
                <FeedLineList lines={linesByKey?.[board.key] ?? []} emptyMessage={LABELS.board.empty} />
              </article>
            ))}
          </div>

          <section className={`${styles.glassBlue} overflow-hidden`}>
            <header className="border-b border-slate-700/70 px-2 py-1.5 text-xs font-black text-blue-300">
              {liveFeedTitle}
            </header>
            <LiveFeedList lines={liveFeed ?? []} emptyMessage={LABELS.board.empty} />
          </section>
        </section>

        <aside className="hidden min-h-0 min-w-0 min-[1181px]:block">
          <div className={styles.stickyWing}>
            <section className={`${styles.glassBlue} p-2.5`}>
              <p className="text-[11px] font-black text-blue-300">{newsAsideTitle}</p>
              {(newsWing?.length ?? 0) === 0 ? (
                <EmptyState message={EMPTY_NEWS} />
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {(newsWing ?? []).map((n, i) => (
                    <li key={n?.id != null ? String(n.id) : `nw-${i}`}>
                      <Link
                        href={n?.href?.trim() ? String(n.href) : '/news'}
                        className="block text-[10px] leading-tight text-slate-200 hover:text-amber-200"
                      >
                        <span className="line-clamp-2 font-medium">{n?.title != null ? String(n.title) : ''}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className={`${styles.glassGold} p-2.5`}>
              <p className="text-[11px] font-black text-amber-300">{localAsideTitle}</p>
              {(localWing?.length ?? 0) === 0 ? (
                <EmptyState message={EMPTY_LOCAL} />
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {(localWing ?? []).map((l, i) => (
                    <li key={l?.id != null ? String(l.id) : `lw-${i}`}>
                      <Link
                        href={l?.href?.trim() ? String(l.href) : '/local'}
                        className="block text-[10px] leading-tight text-slate-200 hover:text-amber-200"
                      >
                        <span className="line-clamp-2 font-medium">{l?.title != null ? String(l.title) : ''}</span>
                        {l?.subtitle != null && String(l.subtitle).trim() ? (
                          <span className="mt-0.5 block text-slate-500">{String(l.subtitle)}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className={`${styles.glassCenter} p-2 text-[10px] text-slate-400`}>
              <p className="font-semibold text-slate-300">{contactTitle}</p>
              <p className="mt-1.5 leading-relaxed text-slate-500">{contactBody}</p>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}
