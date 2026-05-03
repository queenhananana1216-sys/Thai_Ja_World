import 'server-only';

/** 홈 공개 피드 — DB 접근은 `home-queries.ts` 의 anon 전용 클라이언트만 사용(쿠키·SSR 없음). */

import { unstable_cache } from 'next/cache';
import {
  fetchHomeJobs,
  fetchHomeMarket,
  fetchHomePostsByCategory,
  fetchHomeBoardPostsByType,
  fetchHomeLocalPublicView,
  fetchHomeLocalBusinesses,
  fetchHomeLocalDemoBusinesses,
  fetchHomeKoreanBizPortalLines,
  fetchHomeNewsDigest,
  fetchHomeLeftRailBanners,
  fetchHomeUnifiedFeed,
  fetchHomeSiteTotals,
  fetchHomeWeeklyThaiRanking,
  fetchHomeFeaturedPoll,
  fetchHomeTipsPublic,
  fetchAutoCuratedBoardPostsForPortalLive,
  fetchPortalTrendingKeywords,
  fetchPortalThailandPhotoStrip,
  type PortalTrendingKeywordRow,
  type PortalThailandPhotoStripItem,
} from '../../_components/home/home-queries';
import type { HomeUnifiedFeedItem } from '../../_components/home/home-feed-types';
import { categoryLabel } from '@/lib/community/postCategories';
import type { Locale } from '@/i18n/types';
import { getVitalityViewCount } from '@/lib/vitality/dynamicViewCount';
import { reorderVisaTipsForRain } from '@/lib/vitality/visaTipsWeatherBoost';
import { fetchThailandCitiesWeather } from '@/lib/weather/fetchThailandCitiesWeather';
import { wmoIsPrecipitation } from '@/lib/weather/wmoWeatherCode';
import { getLocale } from '@/i18n/get-locale';
import { isQuestMissionNoiseTitle } from './portalLiveFeedTitle';
import { isAutoContentKillerFeedTitle } from '@/lib/cron/autoContentGhostwriter';

export type PortalFeedLine = {
  id: string;
  title: string;
  href: string;
  subtitle: string | null;
  /** 뉴스(processed_news) 한 줄 행 — 상대 시간 표시용 ISO */
  publishedAt?: string | null;
  /** 통합 피드(liveFeed) 전용 — 뱃지·HOT 판별 */
  liveCategory?: string | null;
  liveViewCount?: number;
  liveCreatedAt?: string | null;
  liveHighlight?: boolean;
};

export type PortalWeeklyThaiRankRow = {
  rank: number;
  profileId: string;
  displayName: string;
  thaiEarned: number;
};

/** 홈 밸런스 게임(양자택일) — `polls` + `get_public_poll_totals` */
export type PortalFeaturedPoll = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
};

/** 우측 스티키 데모 롤링(`is_demo` 로컬) — SSR props만 사용 */
export type PortalLocalDemoWingCard = {
  id: string;
  slug: string;
  name: string;
  region: string;
  category: string;
  tagline: string | null;
  imageUrl: string | null;
  emoji: string;
  shopHref: string;
};

export type PortalHomeFeed = {
  jobs: PortalFeedLine[];
  market: PortalFeedLine[];
  freeBoard: PortalFeedLine[];
  /** 비자·생활 꿀팁 — `/tips` 허브와 동일 RPC */
  visaTips: PortalFeedLine[];
  localBiz: PortalFeedLine[];
  /** 우측·중앙 로컬이 데모 폴백만으로 채워졌을 때 롤링·라벨용 */
  localBizFromDemoFallback: boolean;
  /** `is_demo=true` 로컬 상세 — 우측 윙 롤링 카드 전용 */
  localDemoWingCards: PortalLocalDemoWingCard[];
  news: PortalFeedLine[];
  wingBanners: PortalFeedLine[];
  /** 통합 피드(RPC 또는 posts 폴백) — 하단 실시간 스트립 */
  liveFeed: PortalFeedLine[];
  siteTotals: { profileCount: number; communityItemCount: number } | null;
  weeklyThaiRanking: PortalWeeklyThaiRankRow[];
  featuredPoll: PortalFeaturedPoll | null;
  /** search_logs 집계 — 포털 급상승 키워드 */
  trendingKeywords: PortalTrendingKeywordRow[];
  /** 이미지 있는 최근 게시글 썸네일 스트립 */
  thailandPhotos: PortalThailandPhotoStripItem[];
};

/** DB·네트워크 실패·타임아웃 시 — 빈 배열만(플레이스홀더 글·샘플 제목 없음) */
export const HONEST_EMPTY_PORTAL_HOME_FEED: PortalHomeFeed = {
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

const HOME_FETCH_TIMEOUT_MS = 8000;

function unifiedItemToLine(item: HomeUnifiedFeedItem, locale: Locale): PortalFeedLine | null {
  const id = String(item.id ?? '').trim();
  const title = String(item.title ?? '').trim();
  if (!id || !title) return null;
  if (isQuestMissionNoiseTitle(title)) return null;
  const th = locale === 'th';
  /** jobs·market 테이블 id 는 posts 상세와 불일치 — 허브로만 연결 */
  const href =
    item.kind === 'job'
      ? '/community/boards?cat=job'
      : item.kind === 'market'
        ? '/community/boards?cat=flea'
        : `/community/boards/${encodeURIComponent(id)}`;
  const pill =
    item.kind === 'job'
      ? th
        ? 'งาน'
        : '구인'
      : item.kind === 'market'
        ? th
          ? 'ซื้อขาย'
          : '거래'
        : categoryLabel(item.category || 'free', locale);
  const excerpt = item.excerpt?.trim();
  const c = item.comment_count ?? 0;
  const v = item.view_count ?? 0;
  const pv = getVitalityViewCount(Number(v), id);
  const viewLabel = th ? `👀 ${pv.toLocaleString('th-TH')}` : `👀 ${pv.toLocaleString('ko-KR')}`;
  const subtitle = excerpt
    ? `${pill} · ${excerpt.slice(0, 96)}${excerpt.length > 96 ? '…' : ''}`
    : th
      ? `${pill} · ความคิดเห็น ${c} · ${viewLabel}`
      : `${pill} · 댓글 ${c} · ${viewLabel}`;
  const cat =
    item.kind === 'job' ? 'job' : item.kind === 'market' ? 'market' : String(item.category ?? '').trim() || null;
  return {
    id: `${item.kind}-${id}`,
    title,
    href,
    subtitle,
    liveCategory: cat,
    liveViewCount: Number(item.view_count ?? 0),
    liveCreatedAt: String(item.created_at ?? '').trim() || null,
    liveHighlight: Boolean(item.highlight),
  };
}

async function withTimeout<T>(task: Promise<T>, fallback: T, timeoutMs = HOME_FETCH_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      task,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function jobSubtitle(
  row: {
    company_name?: string | null;
    location?: string | null;
    salary?: string | null;
    excerpt?: string | null;
  },
): string | null {
  const parts = [row.company_name, row.location, row.salary].filter(Boolean) as string[];
  if (parts.length) return parts.join(' · ');
  return row.excerpt?.trim() ? row.excerpt.trim().slice(0, 80) : null;
}

function marketSubtitle(
  row: { price_display?: string | null; location?: string | null; excerpt?: string | null; status?: string },
): string | null {
  const parts = [row.price_display, row.location, row.status].filter(Boolean) as string[];
  if (parts.length) return parts.join(' · ');
  return row.excerpt?.trim() ? row.excerpt.trim().slice(0, 80) : null;
}

/** Supabase에서 온 행만 노출. 제목·id 없으면 행 자체를 버림(가짜 플레이스홀더 없음). */
function compactLines(lines: (PortalFeedLine | null)[]): PortalFeedLine[] {
  return lines.filter((x): x is PortalFeedLine => x != null && Boolean(x.id?.trim()) && Boolean(x.title?.trim()));
}

function boardLiveFeedPill(boardType: string, locale: Locale): string {
  if (boardType === 'reports') return locale === 'th' ? 'รายงานตรวจสอบ' : '검증 제보';
  if (boardType === 'tips') return locale === 'th' ? 'ทิปส์ชีวิต' : '생활·여행 팁';
  if (boardType === 'info') return categoryLabel('info', locale);
  if (boardType === 'free') return categoryLabel('free', locale);
  return boardType;
}

function boardAutoRowToPortalLine(
  row: {
    id: string;
    title: string;
    content: string;
    board_type: string;
    created_at: string;
    home_highlight: boolean;
    display_author_label: string | null;
  },
  locale: Locale,
): PortalFeedLine {
  const rawContent = row.content.trim();
  const excerpt = rawContent.replace(/\s+/g, ' ').slice(0, 96);
  const pill = boardLiveFeedPill(row.board_type, locale);
  const parts: string[] = [pill];
  const label = row.display_author_label?.trim();
  if (label) parts.push(label);
  if (excerpt.length > 0) parts.push(excerpt + (rawContent.length > 96 ? '…' : ''));
  return {
    id: `board-${row.id}`,
    title: row.title.trim(),
    href: `/boards/${encodeURIComponent(row.id)}`,
    subtitle: parts.join(' · '),
    liveCategory: row.board_type === 'reports' ? 'reports' : row.board_type === 'tips' ? 'tips' : row.board_type,
    liveViewCount: 0,
    liveCreatedAt: row.created_at.trim() || null,
    liveHighlight: isAutoContentKillerFeedTitle(row.title),
  };
}

/** 고스트라이터 킬러 주제 → 자동 큐레이션 블록 최상단 유지 */
function sortPortalLiveFeedKillerTopicsFirst(lines: PortalFeedLine[]): PortalFeedLine[] {
  const killers: PortalFeedLine[] = [];
  const rest: PortalFeedLine[] = [];
  for (const line of lines) {
    if (isAutoContentKillerFeedTitle(line.title)) killers.push(line);
    else rest.push(line);
  }
  return [...killers, ...rest];
}

function mergeLiveFeedPreferAuto(auto: PortalFeedLine[], unified: PortalFeedLine[], maxTotal: number): PortalFeedLine[] {
  const seen = new Set<string>();
  const out: PortalFeedLine[] = [];
  const autoOrdered = sortPortalLiveFeedKillerTopicsFirst(auto);
  for (const line of [...autoOrdered, ...unified]) {
    const key = line.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= maxTotal) break;
  }
  return out;
}

function portalLocalMinihomeHref(slug: string, miniHome: unknown): string {
  const mh = miniHome && typeof miniHome === 'object' ? (miniHome as Record<string, unknown>) : null;
  const shop =
    (typeof mh?.shop_minihome_slug === 'string' && mh.shop_minihome_slug.trim()) ||
    (typeof mh?.minihome_public_slug === 'string' && mh.minihome_public_slug.trim()) ||
    '';
  if (shop) return `/shop/${encodeURIComponent(shop)}`;
  const s = slug.trim();
  if (s) return `/shop/${encodeURIComponent(s)}`;
  return '/local';
}

/**
 * 루트 포털 3열 — Supabase 실데이터만 (`home-queries` → `createPublicAnonClient()`: jobs, market, posts, processed_news, premium_banners, RPC).
 * 로컬 업체 열이 비면 마지막에 `korean_businesses` → 한인 생활망 링크로 폴백.
 * 타임아웃·에러·빈 결과는 빈 배열; 샘플 글이나 임의 기사 제목을 넣지 않음.
 */
async function fetchPortalHomeFeedCore(portalLocale: Locale): Promise<PortalHomeFeed> {
  const { cities: vitalityCities } = await fetchThailandCitiesWeather(portalLocale);
  const portalRainBoost =
    vitalityCities.some((c) => wmoIsPrecipitation(c.weather_code)) ||
    wmoIsPrecipitation(vitalityCities.find((c) => c.key === 'bangkok')?.weather_code);

  const out: PortalHomeFeed = {
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

  try {
    const j = await withTimeout(fetchHomeJobs(8), { rows: [], error: null });
    out.jobs = compactLines(
      (j.rows ?? []).map((r) => {
        const id = String(r.id ?? '').trim();
        const title = String(r.title ?? '').trim();
        if (!id || !title) return null;
        return {
          id,
          title,
          href: '/community/boards?cat=job',
          subtitle: jobSubtitle(r),
        };
      }),
    );
  } catch {
    out.jobs = [];
  }

  try {
    const m = await withTimeout(fetchHomeMarket(8), { rows: [], error: null });
    out.market = compactLines(
      (m.rows ?? []).map((r) => {
        const id = String(r.id ?? '').trim();
        const title = String(r.title ?? '').trim();
        if (!id || !title) return null;
        return {
          id,
          title,
          href: '/community/boards?cat=flea',
          subtitle: marketSubtitle(r),
        };
      }),
    );
  } catch {
    out.market = [];
  }

  try {
    const bp = await withTimeout(fetchHomeBoardPostsByType('free', 8), { rows: [], error: null });
    const bpRows = bp.rows ?? [];
    if (bpRows.length > 0 && !bp.error) {
      out.freeBoard = compactLines(
        bpRows.map((r) => {
          const id = String(r.id ?? '').trim();
          const title = String(r.title ?? '').trim();
          if (!id || !title) return null;
          return {
            id,
            title,
            href: `/boards/${encodeURIComponent(id)}`,
            subtitle: null,
          };
        }),
      );
    } else {
      const f = await withTimeout(fetchHomePostsByCategory(['free', 'greetings'], 8), {
        rows: [],
        error: null,
      });
      out.freeBoard = compactLines(
        (f.rows ?? []).map((r) => {
          const id = String(r.id ?? '').trim();
          const title = String(r.title ?? '').trim();
          if (!id || !title) return null;
          return {
            id,
            title,
            href: `/community/boards/${encodeURIComponent(id)}`,
            subtitle: r.comment_count != null ? `댓글 ${r.comment_count}` : null,
          };
        }),
      );
    }
  } catch {
    out.freeBoard = [];
  }

  try {
    const tips = await withTimeout(fetchHomeTipsPublic(8), { rows: [], error: null });
    const tipRows = tips.rows ?? [];
    if (!tips.error && tipRows.length > 0) {
      out.visaTips = compactLines(
        tipRows.map((r) => {
          const id = String(r.id ?? '').trim();
          const title = String(r.title ?? '').trim();
          if (!id || !title) return null;
          const ex = String(r.excerpt ?? '').trim();
          const subtitle =
            ex.length > 0 ? `${ex.slice(0, 96)}${ex.length > 96 ? '…' : ''}` : null;
          return {
            id,
            title,
            href: `/tips/${encodeURIComponent(id)}`,
            subtitle,
          };
        }),
      );
    } else {
      out.visaTips = [];
    }
    out.visaTips = reorderVisaTipsForRain(
      out.visaTips,
      portalLocale === 'th' ? 'th' : 'ko',
      portalRainBoost,
    );
  } catch {
    out.visaTips = [];
  }

  try {
    const pub = await withTimeout(fetchHomeLocalPublicView(8), { rows: [], error: null });
    let rows = pub.rows ?? [];
    let fromDemo = false;
    if (rows.length === 0) {
      const rpc = await withTimeout(fetchHomeLocalBusinesses(8), { rows: [], error: null });
      rows = rpc.rows ?? [];
    }
    if (rows.length === 0) {
      const demo = await withTimeout(fetchHomeLocalDemoBusinesses(8), { rows: [], error: null });
      const demoRows = demo.rows ?? [];
      const demoLines = compactLines(
        demoRows.map((r) => {
          const id = String(r.id ?? '').trim();
          const title = String(r.name ?? '').trim();
          const slug = String(r.slug ?? '').trim();
          if (!id || !title) return null;
          return {
            id,
            title,
            href: portalLocalMinihomeHref(slug, r.mini_home),
            subtitle: [r.region, r.category].filter(Boolean).join(' · ') || r.description?.slice(0, 72) || null,
          };
        }),
      );
      if (demoLines.length > 0) {
        fromDemo = true;
        out.localBiz = demoLines;
        out.localBizFromDemoFallback = true;
        out.localDemoWingCards = demoRows
          .map((r): PortalLocalDemoWingCard | null => {
            const id = String(r.id ?? '').trim();
            const name = String(r.name ?? '').trim();
            const slug = String(r.slug ?? '').trim();
            if (!id || !name) return null;
            const imgRaw =
              (typeof r.image_url === 'string' && r.image_url.trim() ? r.image_url.trim() : null) ??
              (Array.isArray(r.image_urls) && typeof r.image_urls[0] === 'string' && r.image_urls[0].trim()
                ? r.image_urls[0].trim()
                : null);
            const em =
              typeof r.emoji === 'string' && r.emoji.trim() ? r.emoji.trim() : '🏪';
            const desc = r.description != null ? String(r.description) : '';
            return {
              id,
              slug,
              name,
              region: String(r.region ?? ''),
              category: String(r.category ?? ''),
              tagline: desc.trim() ? desc.trim().slice(0, 160) : null,
              imageUrl: imgRaw,
              emoji: em,
              shopHref: portalLocalMinihomeHref(slug, r.mini_home),
            };
          })
          .filter((x): x is PortalLocalDemoWingCard => x != null);
      }
    }
    if (!fromDemo) {
      out.localBiz = compactLines(
        rows.map((r) => {
          const id = String(r.id ?? '').trim();
          const title = String(r.name ?? '').trim();
          if (!id || !title) return null;
          return {
            id,
            title,
            href: r.slug ? `/shop/${encodeURIComponent(r.slug)}` : '/local',
            subtitle: [r.region, r.category].filter(Boolean).join(' · ') || r.description?.slice(0, 72) || null,
          };
        }),
      );
      out.localBizFromDemoFallback = false;
    }
  } catch {
    out.localBiz = [];
    out.localBizFromDemoFallback = false;
  }

  try {
    if ((out.localBiz?.length ?? 0) === 0) {
      const kb = await withTimeout(fetchHomeKoreanBizPortalLines(8, portalLocale), { rows: [], error: null });
      if (!kb.error && (kb.rows?.length ?? 0) > 0) {
        out.localBiz = compactLines(
          (kb.rows ?? []).map((r) => ({
            id: String(r.id ?? '').trim(),
            title: String(r.title ?? '').trim(),
            href: r.href?.trim() ? String(r.href) : '/korean-biz',
            subtitle: r.subtitle != null ? String(r.subtitle) : null,
          })),
        );
        out.localBizFromDemoFallback = false;
      }
    }
  } catch {
    /* 한인 생활망 폴백 실패 시 로컬 열은 이미 빈 상태 유지 */
  }

  try {
    const n = await withTimeout(fetchHomeNewsDigest(8, { summaryLocale: 'ko' }), { rows: [], error: null });
    out.news = compactLines(
      (n.rows ?? []).map((r) => {
        const id = String(r.id ?? '').trim();
        const title = String(r.title ?? '').trim();
        if (!id || !title) return null;
        const summaryOne =
          typeof r.summary === 'string' && r.summary.trim() ? r.summary.trim().slice(0, 96) : '';
        return {
          id,
          title,
          href: `/news/${encodeURIComponent(id)}`,
          subtitle: summaryOne ? summaryOne : null,
          publishedAt: r.created_at?.trim() ? String(r.created_at) : null,
        };
      }),
    );
  } catch {
    out.news = [];
  }

  try {
    const b = await withTimeout(fetchHomeLeftRailBanners(), { rows: [], error: null });
    out.wingBanners = compactLines(
      (b.rows ?? []).map((row) => {
        const id = String(row.id ?? '').trim();
        const title = String(row.title ?? '').trim();
        if (!id || !title) return null;
        const href = row.href?.trim() ? String(row.href) : '/ads';
        return {
          id,
          title,
          href,
          subtitle: row.subtitle?.trim() ?? null,
        };
      }),
    );
  } catch {
    out.wingBanners = [];
  }

  try {
    const u = await withTimeout(fetchHomeUnifiedFeed(14), { rows: [], error: null });
    out.liveFeed = compactLines((u.rows ?? []).map((row) => unifiedItemToLine(row, portalLocale))).filter(
      (line) => !isQuestMissionNoiseTitle(line.title),
    );
  } catch {
    out.liveFeed = [];
  }

  try {
    const autoRows = await withTimeout(fetchAutoCuratedBoardPostsForPortalLive(12), [], HOME_FETCH_TIMEOUT_MS);
    if (autoRows.length > 0) {
      const autoLines = autoRows.map((r) => boardAutoRowToPortalLine(r, portalLocale));
      out.liveFeed = mergeLiveFeedPreferAuto(autoLines, out.liveFeed ?? [], 28);
    }
  } catch {
    /* 마이그레이션 미적용·칼럼 부재 시 통합 피드만 유지 */
  }

  try {
    const s = await withTimeout(fetchHomeSiteTotals(), { profileCount: 0, communityItemCount: 0, error: null });
    if (!s.error) {
      out.siteTotals = {
        profileCount: Number(s.profileCount ?? 0),
        communityItemCount: Number(s.communityItemCount ?? 0),
      };
    }
  } catch {
    out.siteTotals = null;
  }

  try {
    const rk = await withTimeout(fetchHomeWeeklyThaiRanking(5), { rows: [], error: null });
    if (!rk.error && (rk.rows?.length ?? 0) > 0) {
      out.weeklyThaiRanking = (rk.rows ?? []).filter((r) => r.profileId && r.displayName);
    }
  } catch {
    out.weeklyThaiRanking = [];
  }

  try {
    const fp = await withTimeout(fetchHomeFeaturedPoll(), { row: null, error: null }, HOME_FETCH_TIMEOUT_MS);
    if (!fp.error && fp.row?.id && fp.row.question) {
      out.featuredPoll = {
        id: fp.row.id,
        question: fp.row.question,
        optionA: fp.row.optionA,
        optionB: fp.row.optionB,
      };
    }
  } catch {
    out.featuredPoll = null;
  }

  try {
    const [tr, ph] = await Promise.all([
      withTimeout(fetchPortalTrendingKeywords(10), [], HOME_FETCH_TIMEOUT_MS),
      withTimeout(fetchPortalThailandPhotoStrip(10), [], HOME_FETCH_TIMEOUT_MS),
    ]);
    out.trendingKeywords = Array.isArray(tr) ? tr : [];
    out.thailandPhotos = Array.isArray(ph) ? ph : [];
  } catch {
    out.trendingKeywords = [];
    out.thailandPhotos = [];
  }

  return out;
}

const getCachedPortalHomeFeed = unstable_cache(
  async (locale: Locale) => fetchPortalHomeFeedCore(locale),
  ['portal-home-feed-v2'],
  /** Next 15.5+: `revalidate: 0`은 `unstable_cache`에 허용되지 않음 — 짧은 TTL로 포털 신선도 유지 */
  { revalidate: 30 },
);

/** 어떤 예외도 홈 SSR을 죽이지 않음 — 전체 실패 시 빈 피드로 2026 포털만 렌더 */
export async function fetchPortalHomeFeed(): Promise<PortalHomeFeed> {
  try {
    const locale = await getLocale().catch(() => 'ko' as Locale);
    return await getCachedPortalHomeFeed(locale);
  } catch (err) {
    console.warn('[fetchPortalHomeFeed] 치명적 오류 — HONEST_EMPTY_PORTAL_HOME_FEED 반환', err);
    return { ...HONEST_EMPTY_PORTAL_HOME_FEED };
  }
}
