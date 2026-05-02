import Link from 'next/link';
import GuestGateLink from '@app/_components/GuestGateLink';
import KoreanNewsPipelineNotice from '../_components/news/KoreanNewsPipelineNotice';
import type { HomeDotoriBalanceRankRow } from '../_components/home/home-queries';
import type {
  PortalFeaturedPoll,
  PortalFeedLine,
  PortalHomeFeed,
  PortalLocalDemoWingCard,
  PortalWeeklyDotoriRankRow,
} from '../lib/home/fetchPortalHomeFeed';
import type { Locale } from '@/i18n/types';
import type { SiteUiSettings } from '@/lib/site-settings/siteUiSettings';
import { siteUiDefaults } from '@/lib/site-settings/siteUiSettings';
import { getDictionary } from '@/i18n/dictionaries';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import { localizeQuestFeedText, stripQuestFeedWeatherClutter } from '@/lib/quests/questFeedLocale';
import { isQuestMissionNoiseTitle } from '../lib/home/portalLiveFeedTitle';
import PortalLocalDemoWingRolling from './PortalLocalDemoWingRolling';
import PortalQuickMenu from './PortalQuickMenu';
import PortalQuestWriteCta from './PortalQuestWriteCta';
import QuickAppLauncher from './QuickAppLauncher';
import PortalWeatherWidget from './PortalWeatherWidget';
import PortalLiveFeedMultiTab from './PortalLiveFeedMultiTab';
import PortalBalancePoll from './PortalBalancePoll';
import PortalDotoriHallOfFame from './PortalDotoriHallOfFame';
import styles from './portal-2026.module.css';

/** 통합 피드 id 접두(`post-uuid` 등)·순수 UUID 기본 상세 경로 — href 누락 시 허브(`/boards`)로 잘못 가는 것 방지 */
const PORTAL_LINE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function defaultHrefForPortalLine(idRaw: string): string {
  const id = idRaw.trim();
  if (!id) return '/boards';
  if (id.startsWith('board-')) {
    const rest = id.slice('board-'.length);
    if (PORTAL_LINE_UUID_RE.test(rest)) return `/boards/${encodeURIComponent(rest)}`;
  }
  if (id.startsWith('post-')) {
    const rest = id.slice('post-'.length);
    if (PORTAL_LINE_UUID_RE.test(rest)) return `/community/boards/${encodeURIComponent(rest)}`;
  }
  if (id.startsWith('job-')) return '/community/boards?cat=job';
  if (id.startsWith('market-')) return '/community/boards?cat=flea';
  if (PORTAL_LINE_UUID_RE.test(id)) return `/community/boards/${encodeURIComponent(id)}`;
  return '/boards';
}

/** processed_news.created_at → 상대 시간 (SSR·클라 동일 규칙) */
function formatPortalNewsAge(iso: string | null | undefined, locale: Locale): string {
  if (!iso?.trim()) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const loc = locale === 'th' ? 'th' : 'ko';
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });
  if (diffMs < 45_000) return locale === 'th' ? 'เมื่อกี้' : '방금';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return locale === 'th' ? 'เมื่อกี้' : '방금';
  if (mins < 60) return rtf.format(-mins, 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 10) return rtf.format(-days, 'day');
  return new Intl.DateTimeFormat(loc === 'th' ? 'th-TH' : 'ko-KR', { month: 'short', day: 'numeric' }).format(d);
}

export type Portal2026ViewProps = {
  feed: PortalHomeFeed;
  locale: Locale;
  siteUi?: SiteUiSettings;
  /** 홈 퍼널 — 비회원 클릭 시 토스트 후 /login */
  isLoggedIn: boolean;
  /** 날씨 위젯 옴니 레이더 툴팁(경고 상세) 노출 — 서버에서 `resolveAdminForUser`로 결정 */
  isAdmin?: boolean;
  /** 보유 도토리 상위 N — `profiles.dotori_balance` */
  dotoriBalanceRanking?: HomeDotoriBalanceRankRow[];
  viewerDotori?: { rank: number; balance: number } | null;
  viewerProfileId?: string | null;
};

function safeFeed(input: PortalHomeFeed | null | undefined): PortalHomeFeed {
  if (!input || typeof input !== 'object') {
    return {
      jobs: [],
      market: [],
      freeBoard: [],
      visaTips: [],
      localBiz: [],
      localBizFromDemoFallback: false,
      localDemoWingCards: [],
      news: [],
      wingBanners: [],
      liveFeed: [],
      siteTotals: null,
      weeklyDotoriRanking: [],
      featuredPoll: null,
    };
  }
  const rk = Array.isArray(input.weeklyDotoriRanking) ? input.weeklyDotoriRanking : [];
  const demoCardsRaw = Array.isArray(input.localDemoWingCards) ? input.localDemoWingCards : [];
  return {
    jobs: Array.isArray(input.jobs) ? input.jobs : [],
    market: Array.isArray(input.market) ? input.market : [],
    freeBoard: Array.isArray(input.freeBoard) ? input.freeBoard : [],
    visaTips: Array.isArray(input.visaTips) ? input.visaTips : [],
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
    featuredPoll: ((): PortalFeaturedPoll | null => {
      const fp = input.featuredPoll;
      if (
        !fp ||
        typeof fp !== 'object' ||
        typeof fp.id !== 'string' ||
        !fp.id.trim() ||
        typeof fp.question !== 'string' ||
        !fp.question.trim() ||
        typeof fp.optionA !== 'string' ||
        typeof fp.optionB !== 'string'
      ) {
        return null;
      }
      const va = Number((fp as PortalFeaturedPoll).votesA);
      const vb = Number((fp as PortalFeaturedPoll).votesB);
      return {
        id: fp.id.trim(),
        question: fp.question.trim(),
        optionA: fp.optionA.trim(),
        optionB: fp.optionB.trim(),
        votesA: Number.isFinite(va) ? va : 0,
        votesB: Number.isFinite(vb) ? vb : 0,
      };
    })(),
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
    const titleRawStr = typeof titleRaw === 'string' ? titleRaw : titleRaw != null ? String(titleRaw) : '';
    const title = stripQuestFeedWeatherClutter(titleRawStr);
    if (!id?.trim() || !title?.trim()) continue;
    const hrefRaw = (l as { href?: unknown }).href;
    const subRaw = (l as { subtitle?: unknown }).subtitle;
    const paRaw = (l as { publishedAt?: unknown }).publishedAt;
    let publishedAt: string | undefined;
    if (typeof paRaw === 'string' && paRaw.trim()) publishedAt = paRaw.trim();
    else if (paRaw != null && String(paRaw).trim()) publishedAt = String(paRaw).trim();
    const base: PortalFeedLine = {
      id: id.trim(),
      title: title.trim(),
      href:
        typeof hrefRaw === 'string' && hrefRaw.trim()
          ? hrefRaw
          : defaultHrefForPortalLine(id.trim()),
      subtitle: (() => {
        if (subRaw == null) return null;
        const raw = typeof subRaw === 'string' ? subRaw : String(subRaw);
        const s = stripQuestFeedWeatherClutter(raw);
        return s.trim() ? s : null;
      })(),
      ...(publishedAt ? { publishedAt } : {}),
    };
    const src = l as PortalFeedLine;
    if (src.liveCategory != null && String(src.liveCategory).trim()) {
      base.liveCategory = String(src.liveCategory).trim();
    }
    if (typeof src.liveViewCount === 'number' && Number.isFinite(src.liveViewCount)) {
      base.liveViewCount = src.liveViewCount;
    }
    if (src.liveCreatedAt != null && String(src.liveCreatedAt).trim()) {
      base.liveCreatedAt = String(src.liveCreatedAt).trim();
    }
    if (src.liveHighlight === true) {
      base.liveHighlight = true;
    }
    out.push(base);
  }
  return out;
}

function EmptyState({ message }: { message: string }) {
  const text = message?.trim() ? message : '—';
  return (
    <div className={styles.emptyState}>
      <p className="m-0 text-base font-medium leading-relaxed text-gray-200">{text}</p>
    </div>
  );
}

function NewsLinesSkeleton({ rows = 7, newsHubMore }: { rows?: number; newsHubMore: string }) {
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
        <Link
          prefetch={true}
          href="/news"
          className="inline-flex min-h-11 max-w-full items-center break-words text-sm font-semibold text-gray-100 hover:text-amber-200"
        >
          {newsHubMore}
        </Link>
      </li>
    </ul>
  );
}

function NewsDenseRowLink({
  item,
  locale,
  isLoggedIn,
}: {
  item: PortalFeedLine;
  locale: Locale;
  isLoggedIn: boolean;
}) {
  const href = item.href?.trim() ? item.href : '/news';
  const d = getDictionary(locale);
  const map = d.quests.feedPhraseMap;
  const title = localizeQuestFeedText(item.title ?? '', locale, map);
  const summary = localizeQuestFeedText(item.subtitle?.trim() ?? '', locale, map);
  const age = formatPortalNewsAge(item.publishedAt ?? null, locale);
  return (
    <li className="border-b border-slate-800/70 py-1 last:border-b-0">
      <GuestGateLink
        href={href}
        isLoggedIn={isLoggedIn}
        className="flex min-h-11 min-w-0 flex-nowrap items-center gap-x-1.5 text-base leading-snug text-gray-100 hover:text-amber-200"
      >
        <span className="min-w-0 max-w-[46%] shrink truncate break-words font-semibold text-white">{title}</span>
        <span className="shrink-0 text-gray-300">·</span>
        <span className="min-w-0 flex-1 truncate break-words text-gray-200">{summary || '—'}</span>
        {age ? (
          <span className="shrink-0 whitespace-nowrap text-sm text-gray-200 tabular-nums">🕒 {age}</span>
        ) : null}
      </GuestGateLink>
    </li>
  );
}

function FeedLineList({
  lines,
  emptyMessage,
  emptyMode = 'default',
  omitEmptyPlaceholder,
  lineLayout = 'default',
  locale,
  newsHubMore,
  isLoggedIn,
}: {
  lines: PortalFeedLine[];
  emptyMessage: string;
  emptyMode?: 'default' | 'news-skeleton' | 'news-translating';
  /** 미션 CTA를 헤더 뱃지로 쓰는 경우 본문 빈 박스 제거 */
  omitEmptyPlaceholder?: boolean;
  /** processed_news 한 줄(제목·요약·시간) */
  lineLayout?: 'default' | 'news-dense';
  locale: Locale;
  newsHubMore: string;
  isLoggedIn: boolean;
}) {
  const d = getDictionary(locale);
  const phraseMap = d.quests.feedPhraseMap;
  const safe = normalizeLines(lines ?? []);
  if (safe.length === 0) {
    if (omitEmptyPlaceholder) {
      return null;
    }
    if (emptyMode === 'news-translating') {
      return <KoreanNewsPipelineNotice />;
    }
    if (emptyMode === 'news-skeleton') {
      return <NewsLinesSkeleton newsHubMore={newsHubMore} />;
    }
    return <EmptyState message={emptyMessage} />;
  }
  if (lineLayout === 'news-dense') {
    return (
      <ul className="max-h-[min(22rem,48vh)] min-h-0 overflow-y-auto overscroll-contain px-1 py-0.5 md:max-h-[min(11rem,36vh)]">
        {safe.map((item, idx) => (
          <NewsDenseRowLink
            key={item?.id ? String(item.id) : `nd-${idx}`}
            item={item}
            locale={locale}
            isLoggedIn={isLoggedIn}
          />
        ))}
      </ul>
    );
  }
  return (
    <ul className="max-h-[min(18rem,45vh)] min-h-0 overflow-y-auto overscroll-contain px-1.5 py-0.5 md:max-h-[min(9.5rem,32vh)]">
      {safe.map((item, idx) => (
        <li
          key={item?.id ? String(item.id) : `feed-${idx}`}
          className="border-b border-slate-800/80 py-1 text-base leading-snug text-gray-100 last:border-b-0"
        >
          <GuestGateLink
            href={item?.href?.trim() ? item.href : defaultHrefForPortalLine(item?.id ?? '')}
            isLoggedIn={isLoggedIn}
            className="flex min-h-11 min-w-0 flex-col justify-center overflow-hidden py-0.5 hover:text-amber-200"
          >
            <span className="line-clamp-2 break-words font-medium text-white">
              {localizeQuestFeedText(item?.title ?? '', locale, phraseMap)}
            </span>
            {item?.subtitle ? (
              <span className="mt-0.5 block line-clamp-2 break-words text-sm text-gray-200">
                {localizeQuestFeedText(item.subtitle, locale, phraseMap)}
              </span>
            ) : null}
          </GuestGateLink>
        </li>
      ))}
    </ul>
  );
}

/**
 * 2026 3열 포털 — `feed`는 서버에서 `fetchPortalHomeFeed()`로만 채움(DB 실데이터).
 */
export default function Portal2026View({
  feed,
  locale,
  siteUi: siteUiProp,
  isLoggedIn,
  isAdmin = false,
  dotoriBalanceRanking = [],
  viewerDotori = null,
  viewerProfileId = null,
}: Portal2026ViewProps) {
  const siteUi = siteUiProp ?? siteUiDefaults();
  const copy = getPortal2026Copy(locale);
  const raw = safeFeed(feed);

  const moreLabel = copy.more;

  const jobs = normalizeLines(raw?.jobs ?? []);
  const market = normalizeLines(raw?.market ?? []);
  const freeBoard = normalizeLines(raw?.freeBoard ?? []);
  const visaTips = normalizeLines(raw?.visaTips ?? []);
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
    visaTips,
  };

  const newsWing = [...(news ?? [])].slice(0, 6);
  const localWing = [...(localBiz ?? [])].slice(0, 5);

  const numLocale = locale === 'th' ? 'th-TH' : 'ko-KR';

  return (
    <div
      className={styles.root}
      data-tj-root="portal-2026-ssr"
      data-ai-chrome={siteUi.hideAiChrome ? 'off' : 'on'}
      role="main"
      aria-label={copy.rootAria}
    >
      <div className={styles.grid}>
        <aside className="hidden min-h-0 min-w-0 min-[769px]:flex min-[769px]:flex-col min-[769px]:gap-2">
          <div className="flex min-w-0 flex-col gap-2">
            {siteUi.weatherWidgetEnabled ? (
              <PortalWeatherWidget locale={locale} isAdmin={isAdmin} />
            ) : null}
            <section className={`${styles.glassBlue} overflow-hidden p-2.5`}>
              <p className="text-lg font-black uppercase tracking-wide text-blue-200">{copy.sponsorTitle}</p>
              {(wingBanners?.length ?? 0) === 0 ? (
                <EmptyState message={copy.emptyWing} />
              ) : (
                <ul className="mt-2 space-y-2">
                  {(wingBanners ?? []).map((b, i) => {
                    const bid = b?.id != null ? String(b.id) : `wing-${i}`;
                    const title = b?.title != null ? String(b.title).trim() : '';
                    if (!title) return null;
                    const href = b?.href?.trim() ? String(b.href) : '/ads';
                    return (
                      <li key={bid} className="min-w-0 overflow-hidden">
                        <Link
                          prefetch={true}
                          href={href}
                          className="flex min-h-11 min-w-0 flex-col justify-center overflow-hidden rounded-lg border border-white/5 bg-slate-950/30 p-2 text-base leading-snug hover:border-amber-300/30"
                        >
                          <span className="line-clamp-2 break-words font-semibold text-white">{title}</span>
                          {b?.subtitle != null && String(b.subtitle).trim() ? (
                            <span className="mt-1 block line-clamp-2 break-words text-sm text-gray-200">
                              {String(b.subtitle)}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
          <QuickAppLauncher locale={locale} />
          <div className="flex min-w-0 flex-col gap-2">
            <section className={`${styles.glassCenter} overflow-hidden p-2 text-base text-gray-100`}>
              <p className="text-lg font-semibold text-white">{copy.shortcutTitle}</p>
              <ul className="mt-1.5 space-y-0">
                <li className="pb-2">
                  <Link
                    prefetch={true}
                    href="/korean-biz"
                    className="inline-flex w-full min-h-12 max-w-full min-w-0 items-center justify-center rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-950/55 via-slate-900/60 to-rose-950/40 px-3 py-2.5 text-center text-base font-extrabold leading-snug text-amber-50 no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_36px_rgba(251,191,36,0.12)] backdrop-blur-md transition hover:border-amber-300/55 hover:from-amber-900/50 hover:to-rose-950/50"
                  >
                    {copy.koreanBizShortcut}
                  </Link>
                </li>
                <li>
                  <Link
                    prefetch={true}
                    href="/boards"
                    className="inline-flex min-h-11 max-w-full min-w-0 break-words text-gray-100 hover:text-amber-200 hover:underline"
                  >
                    {copy.hubBoard}
                  </Link>
                </li>
                <li>
                  <Link
                    prefetch={true}
                    href="/community/trade"
                    className="inline-flex min-h-11 max-w-full min-w-0 break-words text-gray-100 hover:text-amber-200 hover:underline"
                  >
                    {copy.tradeHub}
                  </Link>
                </li>
                <li>
                  <Link
                    prefetch={true}
                    href="/news"
                    className="inline-flex min-h-11 max-w-full min-w-0 break-words text-gray-100 hover:text-amber-200 hover:underline"
                  >
                    {copy.newsLink}
                  </Link>
                </li>
              </ul>
            </section>
            <section className={`${styles.glassGold} overflow-hidden p-2.5`}>
              <p className="text-lg font-black text-amber-200">{copy.rankTitle}</p>
              <p className="mt-0.5 line-clamp-2 break-words text-xs font-semibold uppercase tracking-wide text-amber-100">
                {copy.rankSub}
              </p>
              {(weeklyRankSorted?.length ?? 0) === 0 ? (
                <p className="mt-1 text-base leading-snug text-gray-200">{copy.emptyRank}</p>
              ) : (
                <div className="mt-2 space-y-1">
                  {weeklyRankSorted.map((row) => {
                    const top = row.rank === 1;
                    return (
                      <div
                        key={row.profileId}
                        className={top ? styles.wingRankFirst : styles.wingRankRow}
                        title={`${row.rank} · ${row.dotoriEarned} ${copy.dotoriSuffix}`}
                      >
                        <span
                          className={`${styles.wingRankIdx} ${top ? styles.wingRankIdxGold : ''}`}
                          aria-hidden
                        >
                          {top ? '👑' : row.rank}
                        </span>
                        <div
                          className={`${styles.wingRankMeta} flex min-w-0 flex-wrap items-baseline justify-between gap-x-1.5 gap-y-0.5`}
                        >
                          <span className={`min-w-0 truncate ${top ? styles.wingRankFirstName : styles.wingRankName}`}>
                            {row.displayName}
                          </span>
                          <span className={`shrink-0 whitespace-nowrap ${top ? styles.wingRankFirstDotori : styles.wingRankDotori}`}>
                            +{row.dotoriEarned.toLocaleString(numLocale)} {copy.dotoriSuffix}
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
          <PortalQuickMenu locale={locale} isLoggedIn={isLoggedIn} />
          <div className="block min-[769px]:hidden">
            <PortalDotoriHallOfFame
              instanceId="mobile"
              rows={dotoriBalanceRanking}
              viewer={viewerDotori}
              viewerProfileId={viewerProfileId}
              isLoggedIn={isLoggedIn}
              locale={locale}
            />
          </div>
          <div className="hidden min-[769px]:block">
            <div className={styles.boardGrid}>
            {copy.boardColumns
              .filter((board) => board.key !== 'fxRate')
              .map((board) => {
              const colLines = linesByKey?.[board.key] ?? [];
              const hasPosts = normalizeLines(colLines).length > 0;
              const questCat = board.questCat;
              const showQuestBadge = Boolean(questCat && !hasPosts);
              const emptyMode =
                board.key === 'news' ? ('news-translating' as const) : ('default' as const);

              return (
                <article key={board.key} className={styles.boardColumn}>
                  <header className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-700/50 px-1.5 py-1.5">
                    <h2 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-white">{board.title}</h2>
                    <div className="ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1.5">
                      {showQuestBadge && questCat ? (
                        <PortalQuestWriteCta category={questCat} variant="badge" isLoggedIn={isLoggedIn} />
                      ) : null}
                      <Link
                        prefetch={true}
                        href={board.moreHref ?? '/boards'}
                        className="inline-flex min-h-11 max-w-full shrink-0 items-center truncate text-sm font-semibold text-amber-200 hover:underline"
                      >
                        {moreLabel}
                      </Link>
                    </div>
                  </header>
                  <FeedLineList
                    lines={colLines}
                    emptyMessage={board.key === 'local' ? copy.emptyLocal : copy.emptyList}
                    emptyMode={emptyMode}
                    omitEmptyPlaceholder={Boolean(showQuestBadge && questCat)}
                    lineLayout={board.key === 'news' ? 'news-dense' : 'default'}
                    locale={locale}
                    newsHubMore={copy.newsHubMore}
                    isLoggedIn={isLoggedIn}
                  />
                </article>
              );
            })}
            </div>
          </div>

          {raw.featuredPoll ? (
            <PortalBalancePoll poll={raw.featuredPoll} locale={locale} isLoggedIn={isLoggedIn} />
          ) : null}

          <section className={`${styles.glassBlue} overflow-hidden`}>
            <header className="border-b border-slate-700/70 px-3 py-3 text-lg font-black text-blue-200 max-[768px]:text-xl">
              {copy.liveFeedTitle}
            </header>
            <PortalLiveFeedMultiTab
              lines={liveFeed ?? []}
              locale={locale}
              isLoggedIn={isLoggedIn}
              emptyAll={copy.emptyLiveFeed}
              emptyTab={copy.emptyLiveFeedTab}
              tabAll={copy.liveFeedTabAll}
              tabHot={copy.liveFeedTabHot}
              tabQa={copy.liveFeedTabQa}
              tabFlea={copy.liveFeedTabFlea}
            />
          </section>
        </section>

        <aside className="hidden min-h-0 min-w-0 min-[769px]:block">
          <div className={styles.stickyWing}>
            <PortalDotoriHallOfFame
              instanceId="aside"
              rows={dotoriBalanceRanking}
              viewer={viewerDotori}
              viewerProfileId={viewerProfileId}
              isLoggedIn={isLoggedIn}
              locale={locale}
            />
            <section className={`${styles.glassBlue} overflow-hidden p-2.5`}>
              <p className="line-clamp-2 text-lg font-black text-blue-200 break-words">{copy.newsAsideTitle}</p>
              {(newsWing?.length ?? 0) === 0 ? (
                <KoreanNewsPipelineNotice className="mt-2" />
              ) : (
                <ul className="mt-1.5 max-h-[min(14rem,42vh)] min-w-0 space-y-0 overflow-y-auto overscroll-contain px-0.5">
                  {(newsWing ?? []).map((n, i) => (
                    <NewsDenseRowLink
                      key={n?.id != null ? String(n.id) : `nw-${i}`}
                      item={n}
                      locale={locale}
                      isLoggedIn={isLoggedIn}
                    />
                  ))}
                </ul>
              )}
            </section>
            <section className={`${styles.glassGold} overflow-hidden p-2.5`}>
              <p className="line-clamp-2 text-lg font-black text-amber-200 break-words">{copy.localAsideTitle}</p>
              {localBizFromDemoFallback && localDemoWingCards.length > 0 ? (
                <div className="min-w-0 overflow-hidden">
                  <PortalLocalDemoWingRolling cards={localDemoWingCards} />
                </div>
              ) : (localWing?.length ?? 0) > 0 ? (
                <ul className="mt-2 min-w-0 space-y-1.5">
                  {(localWing ?? []).map((l, i) => (
                    <li key={l?.id != null ? String(l.id) : `rw-${i}`} className="min-w-0 overflow-hidden">
                      <GuestGateLink
                        href={l.href?.trim() ? String(l.href) : '/local'}
                        isLoggedIn={isLoggedIn}
                        className="flex min-h-11 min-w-0 flex-col justify-center overflow-hidden text-base leading-snug text-gray-100 hover:text-amber-200"
                      >
                        <span className="line-clamp-2 break-words font-semibold text-white">{l.title}</span>
                        {l.subtitle ? (
                          <span className="mt-0.5 block line-clamp-2 break-words text-sm text-gray-200">{l.subtitle}</span>
                        ) : null}
                      </GuestGateLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message={copy.emptyLocal} />
              )}
            </section>
            <section className={`${styles.glassCenter} overflow-hidden p-2 text-base text-gray-100`}>
              <p className="text-lg font-semibold text-white">{copy.contactTitle}</p>
              <p className="mt-1.5 leading-relaxed break-words text-gray-200">{copy.contactBody}</p>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
