import Link from 'next/link';
import GuestGateLink from '@app/_components/GuestGateLink';
import KoreanNewsPipelineNotice from '../_components/news/KoreanNewsPipelineNotice';
import type { HomeTodayThaiEarnRankRow } from '../_components/home/home-queries';
import type { ViewerTodayThaiHall } from '@/lib/home/viewerThaiRank';
import type {
  PortalFeaturedPoll,
  PortalFeedLine,
  PortalHomeFeed,
  PortalLocalDemoWingCard,
  PortalWeeklyThaiRankRow,
} from '../lib/home/fetchPortalHomeFeed';
import type { Locale } from '@/i18n/types';
import type { PersonalMissionBrief } from '@/lib/missions/ensurePersonalMissionToday';
import type { CollaborativeMissionRow } from '../_components/home/home-queries';
import type { SiteUiSettings } from '@/lib/site-settings/siteUiSettings';
import { siteUiDefaults } from '@/lib/site-settings/siteUiSettings';
import { getDictionary } from '@/i18n/dictionaries';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import { localizeQuestFeedText, stripQuestFeedWeatherClutter } from '@/lib/quests/questFeedLocale';
import { isQuestMissionNoiseTitle } from '../lib/home/portalLiveFeedTitle';
import PortalLocalDemoWingRolling from './PortalLocalDemoWingRolling';
import PortalMissionHub from './PortalMissionHub';
import PortalQuickMenu from './PortalQuickMenu';
import PortalQuestWriteCta from './PortalQuestWriteCta';
import QuickAppLauncher from './QuickAppLauncher';
import PortalWeatherWidget from './PortalWeatherWidget';
import PortalLiveFeedMultiTab from './PortalLiveFeedMultiTab';
import PortalBalancePoll from './PortalBalancePoll';
import PortalThaiHallOfFame from './PortalThaiHallOfFame';
import PortalThailandPhotoStrip from './PortalThailandPhotoStrip';
import PortalTrendingTicker from './PortalTrendingTicker';
import PortalDailyFortune from './PortalDailyFortune';
import { ThbKrwQuickMenuTile } from '@app/_components/ThbKrwBottomSheet';
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
  /** 서울 당일 경제 로그 양수 합산 TOP N */
  todayThaiEarnRanking?: HomeTodayThaiEarnRankRow[];
  viewerThaiHall?: ViewerTodayThaiHall | null;
  viewerProfileId?: string | null;
  personalMission?: PersonalMissionBrief | null;
  collaborativeMissions?: CollaborativeMissionRow[];
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
      weeklyThaiRanking: [],
      featuredPoll: null,
      trendingKeywords: [],
      thailandPhotos: [],
    };
  }
  const rk = Array.isArray(input.weeklyThaiRanking) ? input.weeklyThaiRanking : [];
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
    weeklyThaiRanking: rk
      .filter(
        (r): r is PortalWeeklyThaiRankRow =>
          r != null &&
          typeof r === 'object' &&
          typeof (r as PortalWeeklyThaiRankRow).rank === 'number' &&
          typeof (r as PortalWeeklyThaiRankRow).profileId === 'string' &&
          typeof (r as PortalWeeklyThaiRankRow).displayName === 'string' &&
          typeof (r as PortalWeeklyThaiRankRow).thaiEarned === 'number',
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
      return {
        id: fp.id.trim(),
        question: fp.question.trim(),
        optionA: fp.optionA.trim(),
        optionB: fp.optionB.trim(),
      };
    })(),
    trendingKeywords: Array.isArray(input.trendingKeywords)
      ? input.trendingKeywords
          .filter(
            (t): t is { rank: number; query: string; count: number } =>
              t != null &&
              typeof t === 'object' &&
              typeof (t as { query?: unknown }).query === 'string' &&
              String((t as { query: string }).query).trim().length > 0,
          )
          .map((t) => ({
            rank: typeof t.rank === 'number' && Number.isFinite(t.rank) ? t.rank : 0,
            query: String(t.query).trim(),
            count: typeof t.count === 'number' && Number.isFinite(t.count) ? t.count : 0,
          }))
          .slice(0, 10)
      : [],
    thailandPhotos: Array.isArray(input.thailandPhotos)
      ? input.thailandPhotos
          .filter(
            (p): p is { href: string; thumbUrl: string; title: string } =>
              p != null &&
              typeof p === 'object' &&
              typeof (p as { href?: unknown }).href === 'string' &&
              typeof (p as { thumbUrl?: unknown }).thumbUrl === 'string' &&
              Boolean(String((p as { href: string }).href).trim()) &&
              Boolean(String((p as { thumbUrl: string }).thumbUrl).trim()),
          )
          .map((p) => ({
            href: String(p.href).trim(),
            thumbUrl: String(p.thumbUrl).trim(),
            title: String(p.title ?? '').trim() || 'photo',
          }))
          .slice(0, 10)
      : [],
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
      <p className="m-0 text-sm font-medium leading-snug text-gray-200 max-[768px]:text-[0.8125rem] max-[768px]:leading-snug md:text-base md:leading-relaxed">
        {text}
      </p>
    </div>
  );
}

function NewsLinesSkeleton({ rows = 7, newsHubMore }: { rows?: number; newsHubMore: string }) {
  const widthClass = ['w-[94%]', 'w-[88%]', 'w-[91%]', 'w-[72%]', 'w-[85%]', 'w-[79%]', 'w-[66%]'];
  return (
    <ul className="space-y-1 px-1 py-0.5" aria-hidden>
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
    <li className="border-b border-slate-800/70 py-0.5 last:border-b-0 md:py-1">
      <GuestGateLink
        href={href}
        isLoggedIn={isLoggedIn}
        className="flex min-h-9 min-w-0 flex-nowrap items-center gap-x-1.5 text-sm leading-snug text-gray-100 hover:text-amber-200 md:min-h-11 md:text-base"
      >
        <span className="min-w-0 max-w-[46%] shrink truncate break-words font-semibold text-white">{title}</span>
        <span className="shrink-0 text-gray-300">·</span>
        <span className="min-w-0 flex-1 truncate break-words text-gray-200">{summary || '—'}</span>
        {age ? (
          <span className="shrink-0 whitespace-nowrap text-xs text-gray-200 tabular-nums max-[768px]:text-[0.7rem] md:text-sm">
            🕒 {age}
          </span>
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
      <ul className="max-h-[min(22rem,48vh)] min-h-0 overflow-y-auto overscroll-contain px-0.5 py-0.5 md:max-h-[min(11rem,36vh)] md:px-1">
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
    <ul className="max-h-[min(18rem,45vh)] min-h-0 overflow-y-auto overscroll-contain px-1 py-0.5 md:max-h-[min(9.5rem,32vh)] md:px-1.5">
      {safe.map((item, idx) => (
        <li
          key={item?.id ? String(item.id) : `feed-${idx}`}
          className="border-b border-slate-800/80 py-0.5 text-sm leading-snug text-gray-100 last:border-b-0 max-[768px]:text-[0.8125rem] max-[768px]:leading-tight md:py-1 md:text-base"
        >
          <GuestGateLink
            href={item?.href?.trim() ? item.href : defaultHrefForPortalLine(item?.id ?? '')}
            isLoggedIn={isLoggedIn}
            className="flex min-h-9 min-w-0 flex-col justify-center overflow-hidden py-0.5 hover:text-amber-200 md:min-h-11"
          >
            <span className="line-clamp-2 break-words font-medium text-white">
              {localizeQuestFeedText(item?.title ?? '', locale, phraseMap)}
            </span>
            {item?.subtitle ? (
              <span className="mt-0.5 block line-clamp-2 break-words text-xs text-gray-200 max-[768px]:text-[0.7rem] max-[768px]:leading-tight md:text-sm">
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
  todayThaiEarnRanking = [],
  viewerThaiHall = null,
  viewerProfileId = null,
  personalMission = null,
  collaborativeMissions = [],
}: Portal2026ViewProps) {
  const siteUi = siteUiProp ?? siteUiDefaults();
  const copy = getPortal2026Copy(locale, siteUi.siteDisplayName);
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
  const weeklyRankSorted = [...(raw.weeklyThaiRanking ?? [])]
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
  const trendingList = raw.trendingKeywords ?? [];
  const fxQuickLabel = locale === 'th' ? 'เรทบาท' : '바트 환율';

  const weeklyRankAside = (
    <section className={`${styles.glassBlue} overflow-hidden p-1.5 md:p-2`}>
      <p className="text-sm font-black text-cyan-200 max-[768px]:text-[0.8125rem] md:text-lg">{copy.rankTitle}</p>
      <p className="mt-0.5 line-clamp-2 break-words text-[10px] font-semibold uppercase tracking-wide text-slate-200/90 md:text-xs">
        {copy.rankSub}
      </p>
      {(weeklyRankSorted?.length ?? 0) === 0 ? (
        <p className="mt-0.5 text-xs leading-snug text-gray-200 max-[768px]:text-[0.7rem] md:mt-1 md:text-sm">
          {copy.emptyRank}
        </p>
      ) : (
        <div className="mt-1 space-y-0.5 md:mt-1.5 md:space-y-1">
          {weeklyRankSorted.map((row) => {
            const top = row.rank === 1;
            return (
              <div
                key={row.profileId}
                className={top ? styles.wingRankFirst : styles.wingRankRow}
                title={`${row.rank} · ${row.thaiEarned} ${copy.thaiSuffix}`}
              >
                <span className={`${styles.wingRankIdx} ${top ? styles.wingRankIdxGold : ''}`} aria-hidden>
                  {top ? '👑' : row.rank}
                </span>
                <div
                  className={`${styles.wingRankMeta} flex min-w-0 flex-wrap items-baseline justify-between gap-x-1.5 gap-y-0.5`}
                >
                  <span className={`min-w-0 truncate ${top ? styles.wingRankFirstName : styles.wingRankName}`}>
                    {row.displayName}
                  </span>
                  <span className={`shrink-0 whitespace-nowrap ${top ? styles.wingRankFirstThai : styles.wingRankThai}`}>
                    +{row.thaiEarned.toLocaleString(numLocale)} {copy.thaiSuffix}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div
      className={styles.root}
      data-tj-root="portal-2026-ssr"
      data-ai-chrome={siteUi.hideAiChrome ? 'off' : 'on'}
      role="main"
      aria-label={copy.rootAria}
    >
      <div className={styles.bentoWrap}>
        <PortalTrendingTicker
          items={trendingList}
          title={copy.trendingTickerTitle}
          emptyLabel={copy.trendingEmpty}
          locale={locale}
        />
        <div className={styles.grid}>
        <aside className="hidden min-h-0 min-w-0 min-[769px]:flex min-[769px]:flex-col min-[769px]:gap-1.5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <section className={`${styles.glassBlue} overflow-hidden p-1.5 md:p-2`}>
              <p className="text-base font-black uppercase tracking-wide text-blue-200 md:text-lg">{copy.sponsorTitle}</p>
              {(wingBanners?.length ?? 0) === 0 ? (
                <EmptyState message={copy.emptyWing} />
              ) : (
                <ul className="mt-1.5 space-y-1.5 md:mt-2 md:space-y-2">
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
          <div className="flex min-w-0 flex-col gap-1.5">
            <section className={`${styles.glassCenter} overflow-hidden p-1.5 text-sm text-gray-100 md:p-2 md:text-base`}>
              <p className="text-base font-semibold text-white md:text-lg">{copy.shortcutTitle}</p>
              <ul className="mt-1 space-y-0 md:mt-1.5">
                <li className="pb-1.5 md:pb-2">
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
          </div>
        </aside>

        <section className="min-h-0 min-w-0 space-y-0.5 max-[768px]:space-y-0.5 md:space-y-1">
          <GuestGateLink
            href="/boards/new?category=greetings"
            isLoggedIn={isLoggedIn}
            className="flex min-h-[2.5rem] w-full items-center justify-center rounded-xl border border-violet-400/30 bg-gradient-to-r from-indigo-700 via-violet-600 to-purple-700 px-2.5 py-1.5 text-center text-sm font-black leading-tight text-white shadow-[0_10px_32px_rgba(91,33,182,0.38)] no-underline transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200 max-[768px]:min-h-[2.35rem] max-[768px]:px-2 max-[768px]:py-1.5 max-[768px]:text-[0.8125rem] md:min-h-[2.85rem] md:rounded-2xl md:px-3 md:py-2 md:text-base md:leading-snug"
            title={copy.openGreetingBannerAria}
          >
            <span className="line-clamp-3 break-words">{copy.openGreetingBannerLine}</span>
          </GuestGateLink>
          <PortalDailyFortune locale={locale} isLoggedIn={isLoggedIn} copy={copy} />
          <PortalQuickMenu
            locale={locale}
            isLoggedIn={isLoggedIn}
            thaiBalance={viewerThaiHall?.balance ?? null}
          />
          <PortalMissionHub
            locale={locale}
            copy={copy}
            personal={personalMission}
            collaborative={collaborativeMissions}
            isLoggedIn={isLoggedIn}
          />
          <div className="block min-[769px]:hidden">
            <PortalThaiHallOfFame
              instanceId="mobile"
              rows={todayThaiEarnRanking}
              viewer={viewerThaiHall}
              viewerProfileId={viewerProfileId}
              isLoggedIn={isLoggedIn}
              locale={locale}
            />
          </div>
          {trendingList.length > 0 ? (
            <div className="block min-[769px]:hidden">
              <section className={`${styles.glassGold} overflow-hidden px-1.5 py-1 md:px-2 md:py-1.5`}>
                <p className="m-0 text-xs font-black text-cyan-100 max-[768px]:text-[0.7rem] md:text-sm">
                  {copy.trendingAsideTitle}
                </p>
                <ol className="mt-0.5 space-y-0 pl-4 text-xs text-slate-200/95 max-[768px]:text-[0.68rem] md:mt-1 md:space-y-0.5 md:text-sm">
                  {trendingList.slice(0, 5).map((t) => (
                    <li key={`${t.rank}-${t.query}`} className="marker:font-bold">
                      <span className="font-extrabold text-cyan-200">{t.rank}.</span> {t.query}{' '}
                      <span className="tabular-nums text-xs text-slate-300/85">
                        ({t.count.toLocaleString(numLocale)})
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          ) : null}
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
                  <header className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 border-b border-slate-700/50 px-1 py-0.5 max-[768px]:py-0.5 md:gap-x-2 md:gap-y-1 md:px-1.5 md:py-1">
                    <h2 className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold leading-tight tracking-tight text-white max-[768px]:text-[0.8125rem] md:text-lg">
                      {board.title}
                    </h2>
                    <div className="ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1.5">
                      {showQuestBadge && questCat ? (
                        <PortalQuestWriteCta category={questCat} variant="badge" isLoggedIn={isLoggedIn} />
                      ) : null}
                      <Link
                        prefetch={true}
                        href={board.moreHref ?? '/boards'}
                        className="inline-flex min-h-9 max-w-full shrink-0 items-center truncate text-xs font-semibold text-amber-200 hover:underline max-[768px]:min-h-8 md:min-h-11 md:text-sm"
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

          {raw.featuredPoll ? (
            <PortalBalancePoll poll={raw.featuredPoll} locale={locale} isLoggedIn={isLoggedIn} />
          ) : null}

          <PortalThailandPhotoStrip
            photos={raw.thailandPhotos ?? []}
            title={copy.thailandPhotosTitle}
            locale={locale}
            isLoggedIn={isLoggedIn}
          />

          <section className={`${styles.glassBlue} overflow-hidden`}>
            <header className="border-b border-slate-700/70 px-2 py-1.5 text-base font-black text-blue-200 max-[768px]:text-[0.9375rem] md:px-3 md:py-2.5 md:text-lg">
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
            <PortalThaiHallOfFame
              instanceId="aside"
              rows={todayThaiEarnRanking}
              viewer={viewerThaiHall}
              viewerProfileId={viewerProfileId}
              isLoggedIn={isLoggedIn}
              locale={locale}
            />
            <section className={`${styles.glassGold} overflow-hidden p-1.5 md:p-2`}>
              <p className="text-sm font-black text-cyan-100 max-[768px]:text-[0.8125rem] md:text-lg">
                {copy.trendingAsideTitle}
              </p>
              {trendingList.length === 0 ? (
                <p className="mt-1 text-xs leading-snug text-slate-300/90 md:text-sm">{copy.trendingEmpty}</p>
              ) : (
                <ol className="mt-1 space-y-0.5 pl-4 text-xs text-slate-200 max-[768px]:text-[0.68rem] md:mt-1.5 md:space-y-1 md:text-[0.92rem]">
                  {trendingList.map((t) => (
                    <li key={`aside-${t.rank}-${t.query}`} className="marker:font-black">
                      <span className="font-extrabold text-cyan-200">{t.rank}.</span> {t.query}{' '}
                      <span className="tabular-nums text-xs text-slate-300/85">
                        ({t.count.toLocaleString(numLocale)})
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            {siteUi.weatherWidgetEnabled ? (
              <div className="min-w-0 overflow-hidden rounded-xl border border-slate-700/40 bg-slate-950/20">
                <PortalWeatherWidget locale={locale} isAdmin={isAdmin} />
              </div>
            ) : null}
            <section
              className={`${styles.glassBlue} overflow-hidden p-1.5 md:p-2`}
              aria-label={fxQuickLabel}
            >
              <ul className="m-0 flex list-none justify-center p-0">
                <ThbKrwQuickMenuTile locale={locale} label={fxQuickLabel} />
              </ul>
            </section>
            {weeklyRankAside}
            <section className={`${styles.glassBlue} overflow-hidden p-1.5 md:p-2`}>
              <p className="line-clamp-2 text-base font-black text-blue-200 break-words md:text-lg">{copy.newsAsideTitle}</p>
              {(newsWing?.length ?? 0) === 0 ? (
                <KoreanNewsPipelineNotice className="mt-2" />
              ) : (
                <ul className="mt-1 max-h-[min(14rem,42vh)] min-w-0 space-y-0 overflow-y-auto overscroll-contain px-0.5 md:mt-1.5">
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
            <section className={`${styles.glassGold} overflow-hidden p-1.5 md:p-2`}>
              <p className="line-clamp-2 text-base font-black text-amber-200 break-words md:text-lg">{copy.localAsideTitle}</p>
              {localBizFromDemoFallback && localDemoWingCards.length > 0 ? (
                <div className="min-w-0 overflow-hidden">
                  <PortalLocalDemoWingRolling cards={localDemoWingCards} />
                </div>
              ) : (localWing?.length ?? 0) > 0 ? (
                <ul className="mt-1.5 min-w-0 space-y-1 md:mt-2 md:space-y-1.5">
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
            <section className={`${styles.glassCenter} overflow-hidden p-1.5 text-sm text-gray-100 md:p-2 md:text-base`}>
              <p className="text-base font-semibold text-white md:text-lg">{copy.contactTitle}</p>
              <p className="mt-1 leading-snug break-words text-gray-200 max-[768px]:text-xs md:mt-1.5 md:leading-relaxed">
                {copy.contactBody}
              </p>
            </section>
          </div>
        </aside>
      </div>
      </div>
    </div>
  );
}
