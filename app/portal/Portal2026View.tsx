import type { ReactNode } from 'react';
import Link from 'next/link';
import type {
  PortalFeedLine,
  PortalHomeFeed,
  PortalLocalDemoWingCard,
  PortalWeeklyDotoriRankRow,
} from '../lib/home/fetchPortalHomeFeed';
import PortalLocalDemoWingRolling from './PortalLocalDemoWingRolling';
import PortalQuestWriteCta from './PortalQuestWriteCta';
import styles from './portal-2026.module.css';

const EMPTY_WING = '등록된 스폰서·안내 슬롯이 없습니다.';
const EMPTY_LOCAL = '등록된 로컬 업체가 아직 없습니다.';
const EMPTY_LIVE_FEED = '실시간 통합 피드 항목이 아직 없습니다.';
const EMPTY_RANK = '이번 주 집계된 랭킹이 아직 없습니다.';

/** processed_news.created_at → 상대 시간 (SSR·클라 동일 규칙) */
function formatPortalNewsAge(iso: string | null | undefined): string {
  if (!iso?.trim()) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 45_000) return '방금';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 10) return `${days}일 전`;
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(d);
}

function splitLiveHotKeywords(text: string): ReactNode {
  const re = /(\[(?:quest)\]|도토리|방명록|Guestbook|guestbook|퀘스트|옥수수|cheers|Cheer)/gi;
  const parts = text.split(re);
  if (parts.length <= 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={`h-${i}-${part}`} className={styles.liveFeedKeywordGlow}>
        {part}
      </span>
    ) : (
      <span key={`p-${i}`}>{part}</span>
    ),
  );
}

const LABELS = {
  board: {
    tradeHubTitle: '중고·알바',
  },
  home: {
    hubBoard: '광장',
    shopsMore: '더 보기 →',
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
      localBizFromDemoFallback: false,
      localDemoWingCards: [],
      news: [],
      wingBanners: [],
      liveFeed: [],
      siteTotals: null,
      weeklyDotoriRanking: [],
    };
  }
  const rk = Array.isArray(input.weeklyDotoriRanking) ? input.weeklyDotoriRanking : [];
  const demoCardsRaw = Array.isArray(input.localDemoWingCards) ? input.localDemoWingCards : [];
  return {
    jobs: Array.isArray(input.jobs) ? input.jobs : [],
    market: Array.isArray(input.market) ? input.market : [],
    freeBoard: Array.isArray(input.freeBoard) ? input.freeBoard : [],
    qna: Array.isArray(input.qna) ? input.qna : [],
    localBiz: Array.isArray(input.localBiz) ? input.localBiz : [],
    localBizFromDemoFallback: Boolean(input.localBizFromDemoFallback),
    localDemoWingCards: demoCardsRaw.filter(
      (c): c is PortalLocalDemoWingCard =>
        c != null &&
        typeof c === 'object' &&
        typeof (c as PortalLocalDemoWingCard).id === 'string' &&
        typeof (c as PortalLocalDemoWingCard).name === 'string' &&
        typeof (c as PortalLocalDemoWingCard).shopHref === 'string',
    ),
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
    weeklyDotoriRanking: rk
      .filter(
        (r): r is PortalWeeklyDotoriRankRow =>
          r != null &&
          typeof r === 'object' &&
          typeof (r as PortalWeeklyDotoriRankRow).rank === 'number' &&
          typeof (r as PortalWeeklyDotoriRankRow).profileId === 'string' &&
          typeof (r as PortalWeeklyDotoriRankRow).displayName === 'string' &&
          typeof (r as PortalWeeklyDotoriRankRow).dotoriEarned === 'number',
      )
      .slice(0, 10),
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
    const paRaw = (l as { publishedAt?: unknown }).publishedAt;
    let publishedAt: string | undefined;
    if (typeof paRaw === 'string' && paRaw.trim()) publishedAt = paRaw.trim();
    else if (paRaw != null && String(paRaw).trim()) publishedAt = String(paRaw).trim();
    out.push({
      id: id.trim(),
      title: title.trim(),
      href: typeof hrefRaw === 'string' && hrefRaw.trim() ? hrefRaw : '/community/boards',
      subtitle:
        typeof subRaw === 'string' ? subRaw : subRaw != null ? String(subRaw) : null,
      ...(publishedAt ? { publishedAt } : {}),
    });
  }
  return out;
}

function EmptyState({ message }: { message: string }) {
  const text = message?.trim() ? message : '—';
  return (
    <div className={styles.emptyState}>
      <p className="m-0 text-[11px] font-medium leading-relaxed text-slate-400">{text}</p>
    </div>
  );
}

function NewsLinesSkeleton({ rows = 7 }: { rows?: number }) {
  const widthClass = ['w-[94%]', 'w-[88%]', 'w-[91%]', 'w-[72%]', 'w-[85%]', 'w-[79%]', 'w-[66%]'];
  return (
    <ul className="space-y-1.5 px-1.5 py-0.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className={`${styles.newsLineSkeleton} ${widthClass[i % widthClass.length] ?? 'w-[85%]'}`}
        >
          <div className={styles.newsLineSkeletonInner} />
        </li>
      ))}
      <li className="pt-0.5">
        <Link href="/news" className="text-[9px] font-semibold text-slate-500 hover:text-amber-300">
          뉴스 허브에서 전체 보기 →
        </Link>
      </li>
    </ul>
  );
}

function NewsDenseRowLink({ item }: { item: PortalFeedLine }) {
  const href = item.href?.trim() ? item.href : '/news';
  const summary = item.subtitle?.trim() ?? '';
  const age = formatPortalNewsAge(item.publishedAt ?? null);
  return (
    <li className="border-b border-slate-800/70 py-0.5 last:border-b-0">
      <Link
        href={href}
        className="flex min-w-0 flex-nowrap items-baseline gap-x-1 text-[10px] leading-[1.35] text-slate-200 hover:text-amber-200"
      >
        <span className="min-w-0 max-w-[46%] shrink truncate font-semibold text-slate-100">{item.title}</span>
        <span className="shrink-0 text-slate-600">·</span>
        <span className="min-w-0 flex-1 truncate text-slate-500">{summary || '—'}</span>
        {age ? (
          <span className="shrink-0 whitespace-nowrap text-[9px] text-slate-500 tabular-nums">🕒 {age}</span>
        ) : null}
      </Link>
    </li>
  );
}

function FeedLineList({
  lines,
  emptyMessage,
  emptyMode = 'default',
  omitEmptyPlaceholder,
  lineLayout = 'default',
}: {
  lines: PortalFeedLine[];
  emptyMessage: string;
  emptyMode?: 'default' | 'news-skeleton';
  /** 퀘스트 CTA를 헤더 뱃지로 쓰는 경우 본문 빈 박스 제거 */
  omitEmptyPlaceholder?: boolean;
  /** processed_news 한 줄(제목·요약·시간) */
  lineLayout?: 'default' | 'news-dense';
}) {
  const safe = normalizeLines(lines ?? []);
  if (safe.length === 0) {
    if (omitEmptyPlaceholder) {
      return null;
    }
    if (emptyMode === 'news-skeleton') {
      return <NewsLinesSkeleton />;
    }
    return <EmptyState message={emptyMessage} />;
  }
  if (lineLayout === 'news-dense') {
    return (
      <ul className="max-h-[min(11rem,36vh)] min-h-0 overflow-y-auto overscroll-contain px-1 py-0.5">
        {safe.map((item, idx) => (
          <NewsDenseRowLink key={item?.id ? String(item.id) : `nd-${idx}`} item={item} />
        ))}
      </ul>
    );
  }
  return (
    <ul className="max-h-[min(9.5rem,32vh)] min-h-0 overflow-y-auto overscroll-contain px-1.5 py-0.5">
      {safe.map((item, idx) => (
        <li
          key={item?.id ? String(item.id) : `feed-${idx}`}
          className="border-b border-slate-800/80 py-0.5 text-[10px] leading-tight text-slate-200 last:border-b-0"
        >
          <Link href={item?.href?.trim() ? item.href : '/community/boards'} className="block hover:text-amber-200">
            <span className="line-clamp-2 font-medium text-slate-100">{item?.title ?? ''}</span>
            {item?.subtitle ? (
              <span className="mt-0.5 block line-clamp-1 text-[9px] text-slate-500">{item.subtitle}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function isLiveGamificationLine(item: PortalFeedLine): boolean {
  const t = `${item.title} ${item.subtitle ?? ''}`;
  const lower = t.toLowerCase();
  return (
    /\[(?:quest)\]/i.test(t) ||
    lower.includes('도토리') ||
    lower.includes('방명록') ||
    lower.includes('guestbook') ||
    lower.includes('퀘스트') ||
    lower.includes('옥수수') ||
    lower.includes('cheers') ||
    lower.includes('cheer') ||
    lower.includes('quest') ||
    lower.includes('달성')
  );
}

function LiveFeedList({ lines, emptyMessage }: { lines: PortalFeedLine[]; emptyMessage: string }) {
  const safe = normalizeLines(lines ?? []);
  if (safe.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <ul className="max-h-[280px] min-h-0 overflow-y-auto overscroll-contain px-2 py-1">
      {safe.map((item, idx) => {
        const hot = isLiveGamificationLine(item);
        const title = item?.title ?? '';
        const sub = item?.subtitle ?? '';
        return (
          <li
            key={item?.id ? String(item.id) : `live-${idx}`}
            className={`border-b border-slate-800/90 py-1 text-[11px] leading-snug last:border-b-0 ${
              hot ? styles.liveFeedRowHot : 'text-slate-200'
            }`}
          >
            <Link
              href={item?.href?.trim() ? item.href : '/community/boards'}
              className={`block hover:text-amber-200 ${hot ? 'px-0.5' : ''}`}
            >
              <span className={`line-clamp-2 ${hot ? 'font-semibold text-slate-100' : 'font-normal text-slate-100'}`}>
                {hot ? splitLiveHotKeywords(title) : title}
              </span>
              {sub ? (
                <span
                  className={`mt-0.5 block line-clamp-1 text-[10px] ${
                    hot ? 'font-medium text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {hot ? splitLiveHotKeywords(sub) : sub}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const BOARD_COLUMNS = [
  { title: '구인구직', moreHref: '/community/boards?cat=job', key: 'job' as const, questCat: 'job' as const },
  { title: '번개장터', moreHref: '/community/boards?cat=flea', key: 'flea' as const, questCat: 'flea' as const },
  { title: '자유게시판', moreHref: '/community/boards?cat=free', key: 'free' as const, questCat: 'free' as const },
  { title: '로컬 업체', moreHref: '/local', key: 'local' as const },
  { title: '태국 뉴스', moreHref: '/news', key: 'news' as const },
  { title: '생활 Q&A', moreHref: '/community/boards?cat=qna', key: 'qna' as const },
];

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
  const localBizFromDemoFallback = raw.localBizFromDemoFallback;
  const localDemoWingCards = raw.localDemoWingCards ?? [];
  const weeklyRankSorted = [...(raw.weeklyDotoriRanking ?? [])]
    .filter((r) => r && typeof r.rank === 'number')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5);

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
  const rankTitle = '주간 도토리 획득 TOP 5';
  const liveFeedTitle = '실시간 통합 피드';
  const newsAsideTitle = '최신 뉴스 (AI 요약)';
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
    <div className={styles.root} data-tj-root="portal-2026-ssr" role="main" aria-label="태자월드 2026 포털">
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
            <section className={`${styles.glassGold} p-2.5`}>
              <p className="text-[11px] font-black text-amber-300">{rankTitle}</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200/70">
                이번 주 서울 주간 퀘스트 집계
              </p>
              {(weeklyRankSorted?.length ?? 0) === 0 ? (
                <p className="mt-1 text-[10px] leading-snug text-slate-500">{EMPTY_RANK}</p>
              ) : (
                <div className="mt-2 space-y-1">
                  {weeklyRankSorted.map((row) => {
                    const top = row.rank === 1;
                    return (
                      <div
                        key={row.profileId}
                        className={top ? styles.wingRankFirst : styles.wingRankRow}
                        title={`${row.rank}위 · ${row.dotoriEarned} 도토리`}
                      >
                        <span
                          className={`${styles.wingRankIdx} ${top ? styles.wingRankIdxGold : ''}`}
                          aria-hidden
                        >
                          {top ? '👑' : row.rank}
                        </span>
                        <div
                          className={`${styles.wingRankMeta} flex min-w-0 flex-wrap items-baseline justify-between gap-x-1`}
                        >
                          <span className={`min-w-0 truncate ${top ? styles.wingRankFirstName : styles.wingRankName}`}>
                            {row.displayName}
                          </span>
                          <span className={`shrink-0 whitespace-nowrap ${top ? styles.wingRankFirstDotori : styles.wingRankDotori}`}>
                            +{row.dotoriEarned.toLocaleString('ko-KR')} 도토리
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </aside>

        <section className="min-h-0 min-w-0 space-y-1.5">
          <div className={`${styles.boardGrid}`}>
            {BOARD_COLUMNS.map((board) => {
              const colLines = linesByKey?.[board.key] ?? [];
              const hasPosts = normalizeLines(colLines).length > 0;
              const questCat = board.questCat;
              const showQuestBadge = Boolean(questCat && !hasPosts);
              const emptyMode =
                board.key === 'news' ? ('news-skeleton' as const) : ('default' as const);

              return (
                <article key={board.key} className={styles.boardColumn}>
                  <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-700/50 px-1.5 py-1">
                    <h2 className="text-[11px] font-bold tracking-tight text-slate-100">{board.title}</h2>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                      {showQuestBadge && questCat ? (
                        <PortalQuestWriteCta category={questCat} variant="badge" />
                      ) : null}
                      <Link
                        href={board.moreHref ?? '/community/boards'}
                        className="shrink-0 text-[10px] font-semibold text-amber-300 hover:underline"
                      >
                        {moreLabel}
                      </Link>
                    </div>
                  </header>
                  <FeedLineList
                    lines={colLines}
                    emptyMessage={board.key === 'local' ? EMPTY_LOCAL : '목록을 불러오지 못했습니다.'}
                    emptyMode={emptyMode}
                    omitEmptyPlaceholder={Boolean(showQuestBadge && questCat)}
                    lineLayout={board.key === 'news' ? 'news-dense' : 'default'}
                  />
                </article>
              );
            })}
          </div>

          <section className={`${styles.glassBlue} overflow-hidden`}>
            <header className="border-b border-slate-700/70 px-2 py-1.5 text-xs font-black text-blue-300">
              {liveFeedTitle}
            </header>
            <LiveFeedList lines={liveFeed ?? []} emptyMessage={EMPTY_LIVE_FEED} />
          </section>
        </section>

        <aside className="hidden min-h-0 min-w-0 min-[1181px]:block">
          <div className={styles.stickyWing}>
            <section className={`${styles.glassBlue} p-2.5`}>
              <p className="text-[11px] font-black text-blue-300">{newsAsideTitle}</p>
              {(newsWing?.length ?? 0) === 0 ? (
                <NewsLinesSkeleton rows={6} />
              ) : (
                <ul className="mt-1.5 max-h-[min(14rem,42vh)] space-y-0 overflow-y-auto overscroll-contain px-0.5">
                  {(newsWing ?? []).map((n, i) => (
                    <NewsDenseRowLink key={n?.id != null ? String(n.id) : `nw-${i}`} item={n} />
                  ))}
                </ul>
              )}
            </section>
            <section className={`${styles.glassGold} p-2.5`}>
              <p className="text-[11px] font-black text-amber-300">{localAsideTitle}</p>
              {localBizFromDemoFallback && localDemoWingCards.length > 0 ? (
                <PortalLocalDemoWingRolling cards={localDemoWingCards} />
              ) : (localWing?.length ?? 0) > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {(localWing ?? []).map((l, i) => (
                    <li key={l?.id != null ? String(l.id) : `rw-${i}`}>
                      <Link
                        href={l.href?.trim() ? String(l.href) : '/local'}
                        className="block text-[10px] leading-tight text-slate-200 hover:text-amber-200"
                      >
                        <span className="line-clamp-2 font-semibold text-slate-100">{l.title}</span>
                        {l.subtitle ? (
                          <span className="mt-0.5 block text-[9px] text-slate-500">{l.subtitle}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message={EMPTY_LOCAL} />
              )}
            </section>
            <section className={`${styles.glassCenter} p-2 text-[10px] text-slate-400`}>
              <p className="font-semibold text-slate-300">{contactTitle}</p>
              <p className="mt-1.5 leading-relaxed text-slate-500">{contactBody}</p>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
