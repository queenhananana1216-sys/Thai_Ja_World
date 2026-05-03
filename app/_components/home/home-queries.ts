/**
 * 홈 커뮤니티 허브 — Server-only 로더.
 * 공개 데이터만: `cookies()` / `@supabase/ssr` 미사용, `@supabase/supabase-js` anon 단일 클라이언트.
 *
 * 참고: 구인·번개는 과거 `posts(job|flea)`에서 `jobs`·`market`으로 분리됨(083).
 */
import 'server-only';

import { unstable_cache } from 'next/cache';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  listTitleSummaryFromProcessedNoRaw,
  passesKoPublicGate,
} from '@/lib/news/processedNewsDisplay';
import { getLocale } from '@/i18n/get-locale';
import type { Locale } from '@/i18n/types';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { JobPost, MarketPost, PortalPostRow, PremiumBannerRow } from '../../portal/types';
import type { LocalBusiness } from '@/types/taeworld';
import type { HomeUnifiedFeedItem } from './home-feed-types';
import { mergeWarmupTodayThaiRanking } from '@/lib/vitality/warmupRanking';

export type { HomeUnifiedFeedItem } from './home-feed-types';

const PUBLIC_FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), PUBLIC_FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(tid));
}

/** 홈 꿀팁·실시간 통합 피드 — Next Data Cache 30초 ISR */
function fetchWithTimeoutRevalidated(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), PUBLIC_FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: ctrl.signal, next: { revalidate: 30 } }).finally(() =>
    clearTimeout(tid),
  );
}

/** 익명 공개 읽기 전용 — SSR 쿠키/세션 미연동 */
function createPublicAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetchWithTimeout },
  });
}

function createPublicAnonCachedClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetchWithTimeoutRevalidated },
  });
}

function tryCreate(): SupabaseClient | null {
  return createPublicAnonClient();
}

function tryCreateCached(): SupabaseClient | null {
  return createPublicAnonCachedClient();
}

const POST_COLS =
  'id, title, excerpt, content, category, created_at, comment_count, view_count, image_urls, author_hidden, moderation_status, is_knowledge_tip' as const;

const JOB_COLS =
  'id, title, excerpt, created_at, company_name, location, salary, moderation_status, author_hidden' as const;

const MARKET_COLS =
  'id, title, excerpt, created_at, price_display, status, location, moderation_status, author_hidden' as const;

export type HomeNewsRow = {
  id: string;
  title: string;
  summary: string;
  href: string;
  /** processed_news.created_at — 포털 한 줄 뉴스의 🕒 상대 시간 */
  created_at: string;
};

export type HomeRecommendedRow = {
  id: string;
  title: string;
  href: string;
  score: number;
};

export type HomeTipArticleRow = {
  id: string;
  title: string;
  excerpt: string;
  published_at: string | null;
  created_at: string;
};

export type HomeCommunityPostRow = {
  id: string;
  title: string;
  created_at: string;
  comment_count: number;
  view_count?: number;
  category: string;
};

export type UxTotalsPublic = {
  total?: number;
  page_view?: number;
  click?: number;
  dead_click?: number;
  js_error?: number;
  api_error?: number;
  dead_click_rate?: number;
  local_views?: number;
  local_qr_click?: number;
  local_minihome_click?: number;
  avg_dwell_seconds?: number;
};

function mapUnifiedRpcRow(r: Record<string, unknown>): HomeUnifiedFeedItem {
  const k = r.kind;
  const kind: HomeUnifiedFeedItem['kind'] =
    k === 'job' ? 'job' : k === 'market' ? 'market' : 'post';
  const highlightRaw = r.highlight ?? r.is_featured ?? r.is_pinned ?? r.force_home_feed ?? r.home_highlight;
  return {
    kind,
    id: String(r.id ?? ''),
    created_at: String(r.created_at ?? ''),
    title: String(r.title ?? ''),
    excerpt: r.excerpt != null ? String(r.excerpt) : null,
    category: String(r.category ?? ''),
    comment_count: Number(r.comment_count ?? 0),
    view_count: Number(r.view_count ?? 0),
    image_url: r.image_url != null ? String(r.image_url) : null,
    highlight: Boolean(
      highlightRaw === true ||
        highlightRaw === 1 ||
        (typeof highlightRaw === 'string' && ['true', '1', 'yes'].includes(highlightRaw.toLowerCase())),
    ),
  };
}

function mapPortalRowToUnified(p: PortalPostRow): HomeUnifiedFeedItem {
  return {
    kind: 'post',
    id: p.id,
    created_at: p.created_at,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    comment_count: p.comment_count ?? 0,
    view_count: p.view_count ?? 0,
    image_url: p.image_urls?.[0] ?? null,
  };
}

export async function fetchHomeSiteTotals(): Promise<{
  profileCount: number;
  communityItemCount: number;
  error: string | null;
}> {
  const sb = tryCreate();
  if (!sb) {
    return { profileCount: 0, communityItemCount: 0, error: 'Supabase 환경 변수가 없습니다.' };
  }

  const { data, error } = await sb.rpc('get_public_home_site_totals');
  if (error) {
    const missing = error.message.includes('function') && error.message.includes('does not exist');
    return {
      profileCount: 0,
      communityItemCount: 0,
      error: missing
        ? '전역 통계 RPC 미적용: supabase/migrations/114_public_home_site_totals_rpc.sql 배포 후 표시됩니다.'
        : error.message,
    };
  }

  const row = Array.isArray(data)
    ? (data[0] as { profile_count?: unknown; community_item_count?: unknown } | undefined)
    : null;
  if (!row) {
    return { profileCount: 0, communityItemCount: 0, error: null };
  }

  return {
    profileCount: Number(row.profile_count ?? 0),
    communityItemCount: Number(row.community_item_count ?? 0),
    error: null,
  };
}

function mapPremiumBannerRow(b: Record<string, unknown>): PremiumBannerRow {
  return {
    id: String(b.id),
    slot: String(b.slot ?? ''),
    title: String(b.title ?? ''),
    subtitle: b.subtitle != null ? String(b.subtitle) : null,
    image_url: b.image_url != null ? String(b.image_url) : null,
    href: b.href != null ? String(b.href) : null,
    badge_text: b.badge_text != null ? String(b.badge_text) : null,
    sort_order: Number(b.sort_order ?? 0),
  };
}

/** 중앙 히어로 슬라이더 — `premium_banners.slot = portal_hero` */
export async function fetchHomePortalHeroBanners(): Promise<{ rows: PremiumBannerRow[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('premium_banners')
    .select('id, slot, title, subtitle, image_url, href, badge_text, sort_order')
    .eq('slot', 'portal_hero')
    .order('sort_order', { ascending: true })
    .limit(16);

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []).map((b) => mapPremiumBannerRow(b as Record<string, unknown>)), error: null };
}

/** 좌측 세로 레일 — `sidebar` · `home_strip` */
export async function fetchHomeLeftRailBanners(): Promise<{ rows: PremiumBannerRow[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('premium_banners')
    .select('id, slot, title, subtitle, image_url, href, badge_text, sort_order')
    .in('slot', ['sidebar', 'home_strip'])
    .order('sort_order', { ascending: true })
    .limit(24);

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []).map((b) => mapPremiumBannerRow(b as Record<string, unknown>)), error: null };
}

export async function fetchHomeNewsMarqueeTitles(limit = 24): Promise<{ titles: string[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { titles: [], error: 'Supabase 환경 변수가 없습니다.' };

  const fetchCap = Math.min(Math.max(limit * 6, limit), 96);
  const { data, error } = await sb
    .from('processed_news')
    .select('id, clean_body, language, summaries(summary_text, model)')
    .eq('published', true)
    .eq('language', 'ko')
    .order('created_at', { ascending: false })
    .limit(fetchCap);

  if (error) return { titles: [], error: error.message };

  const locale = await getLocale().catch(() => 'ko' as const);
  const loc = locale === 'th' ? 'th' : 'ko';
  const titles: string[] = [];
  for (const pn of data ?? []) {
    const sums = pn.summaries as { summary_text: string; model: string | null }[] | null;
    if (!passesKoPublicGate(pn.language as string | null, (pn.clean_body as string | null) ?? null, sums ?? null)) {
      continue;
    }
    const parsed = listTitleSummaryFromProcessedNoRaw(
      (pn.clean_body as string | null) ?? null,
      sums ?? null,
      loc,
    );
    if (parsed?.title?.trim()) titles.push(parsed.title.trim());
    if (titles.length >= limit) break;
  }

  return { titles, error: null };
}

export async function fetchHomeJobs(limit = 5): Promise<{ rows: Pick<JobPost, 'id' | 'title' | 'excerpt' | 'created_at' | 'company_name' | 'location' | 'salary'>[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('jobs')
    .select(JOB_COLS)
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };

  return {
    rows: (data ?? []).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ''),
      excerpt: r.excerpt != null ? String(r.excerpt) : null,
      created_at: String(r.created_at ?? ''),
      company_name: r.company_name != null ? String(r.company_name) : null,
      location: r.location != null ? String(r.location) : null,
      salary: r.salary != null ? String(r.salary) : null,
    })),
    error: null,
  };
}

export async function fetchHomeMarket(limit = 5): Promise<{ rows: Pick<MarketPost, 'id' | 'title' | 'excerpt' | 'created_at' | 'price_display' | 'status' | 'location'>[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('market')
    .select(MARKET_COLS)
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .in('status', ['available', 'reserved', 'sold'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };

  return {
    rows: (data ?? []).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ''),
      excerpt: r.excerpt != null ? String(r.excerpt) : null,
      created_at: String(r.created_at ?? ''),
      price_display: r.price_display != null ? String(r.price_display) : null,
      status: String(r.status ?? ''),
      location: r.location != null ? String(r.location) : null,
    })),
    error: null,
  };
}

export async function fetchHomeLocalBusinesses(limit = 5): Promise<{ rows: LocalBusiness[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb.rpc('get_local_businesses_public', { limit_n: limit });
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as LocalBusiness[], error: null };
}

/** `local_businesses_public` 뷰 — 추천·최신 우선 (뷰에 조회수 컬럼 없음) */
export async function fetchHomeLocalPublicView(limit = 5): Promise<{ rows: LocalBusiness[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('local_businesses_public')
    .select('id, slug, name, category, region, description, image_url, emoji, tier, is_recommended, has_discount, discount, tags')
    .order('is_recommended', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };

  const rows = (data ?? []).map((r) => ({
    id: String(r.id),
    slug: String(r.slug ?? ''),
    name: String(r.name ?? ''),
    category: String(r.category ?? ''),
    region: String(r.region ?? ''),
    description: r.description != null ? String(r.description) : null,
    image_url: r.image_url != null ? String(r.image_url) : null,
    emoji: String(r.emoji ?? '🏪'),
    tier: (['premium', 'standard', 'basic'].includes(String(r.tier))
      ? String(r.tier)
      : 'basic') as LocalBusiness['tier'],
    is_recommended: Boolean(r.is_recommended),
    has_discount: Boolean(r.has_discount),
    discount: r.discount != null ? String(r.discount) : null,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
  }));

  return { rows, error: null };
}

export async function fetchHomeNewsDigest(
  limit = 5,
  opts?: { summaryLocale?: 'ko' | 'th' },
): Promise<{ rows: HomeNewsRow[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const fetchCap = Math.min(Math.max(limit * 8, limit), 120);
  const { data, error } = await sb
    .from('processed_news')
    .select('id, clean_body, created_at, language, summaries(summary_text, model)')
    .eq('published', true)
    .eq('language', 'ko')
    .order('created_at', { ascending: false })
    .limit(fetchCap);

  if (error) return { rows: [], error: error.message };

  const locale =
    opts?.summaryLocale ??
    (await getLocale().catch(() => 'ko' as const));
  const loc = locale === 'th' ? 'th' : 'ko';
  const rows: HomeNewsRow[] = [];
  for (const pn of data ?? []) {
    const id = String(pn.id);
    const sums = pn.summaries as { summary_text: string; model: string | null }[] | null;
    if (!passesKoPublicGate(pn.language as string | null, (pn.clean_body as string | null) ?? null, sums ?? null)) {
      continue;
    }
    const parsed = listTitleSummaryFromProcessedNoRaw(
      (pn.clean_body as string | null) ?? null,
      sums ?? null,
      loc,
    );
    if (!parsed) continue;
    const t = parsed.title.trim();
    if (!t) continue;
    rows.push({
      id,
      title: t,
      summary: (parsed.summary_text ?? '').trim(),
      href: `/news/${encodeURIComponent(id)}`,
      created_at: pn.created_at != null ? String(pn.created_at) : '',
    });
    if (rows.length >= limit) break;
  }

  return { rows, error: null };
}

export type HomeLocalDemoBusinessRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  region: string;
  description: string | null;
  mini_home: unknown;
  image_url: string | null;
  image_urls: string[];
  emoji: string;
};

/** `is_demo=true` 로컬 업체 — 실데이터가 비었을 때 포털 우측·중앙 폴백 전용 */
export async function fetchHomeLocalDemoBusinesses(
  limit = 6,
): Promise<{ rows: HomeLocalDemoBusinessRow[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('local_businesses')
    .select('id, slug, name, category, region, description, mini_home, is_demo, is_active, image_url, image_urls, emoji')
    .eq('is_demo', true)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    const missing =
      error.message.includes('column') &&
      (error.message.includes('is_demo') || error.message.includes('does not exist'));
    if (missing) return { rows: [], error: null };
    return { rows: [], error: error.message };
  }

  const rows: HomeLocalDemoBusinessRow[] = (data ?? []).map((r) => ({
    id: String(r.id),
    slug: String(r.slug ?? ''),
    name: String(r.name ?? ''),
    category: String(r.category ?? ''),
    region: String(r.region ?? ''),
    description: r.description != null ? String(r.description) : null,
    mini_home: r.mini_home,
    image_url: r.image_url != null ? String(r.image_url) : null,
    image_urls: Array.isArray(r.image_urls) ? (r.image_urls as string[]).filter((x) => typeof x === 'string') : [],
    emoji: typeof r.emoji === 'string' && r.emoji.trim() ? r.emoji.trim() : '🏪',
  }));

  return { rows, error: null };
}

function koreanBizRegionLabel(region: string, locale: Locale): string {
  const ko: Record<string, string> = {
    bangkok: '방콕',
    pattaya: '파타야',
    chiangmai: '치앙마이',
  };
  const th: Record<string, string> = {
    bangkok: 'กรุงเทพฯ',
    pattaya: 'พัทยา',
    chiangmai: 'เชียงใหม่',
  };
  const m = locale === 'th' ? th : ko;
  return m[region] ?? region;
}

function koreanBizCategoryLabel(category: string, locale: Locale): string {
  const ko: Record<string, string> = {
    mart: '마트',
    pharmacy: '약국',
    hospital: '병원',
    vehicle_rent: '렌트',
    golf: '골프',
    massage_spa: '마사지·스파',
  };
  const th: Record<string, string> = {
    mart: 'มาร์ท',
    pharmacy: 'ร้านยา',
    hospital: 'โรงพยาบาล',
    vehicle_rent: 'เช่ารถ',
    golf: 'กอล์ฟ',
    massage_spa: 'นวด·สปา',
  };
  const m = locale === 'th' ? th : ko;
  return m[category] ?? category;
}

export type HomeKoreanBizPortalLine = {
  id: string;
  title: string;
  href: string;
  subtitle: string | null;
};

/**
 * `korean_businesses` — `local_businesses_public`·RPC·데모가 모두 비었을 때
 * 포털 로컬 열·우측 윙에 한인 생활망 링크를 채우기 위한 공개 읽기 전용 목록.
 */
export async function fetchHomeKoreanBizPortalLines(
  limit = 8,
  locale: Locale = 'ko',
): Promise<{ rows: HomeKoreanBizPortalLine[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('korean_businesses')
    .select('id, name, category, region')
    .order('name', { ascending: true })
    .limit(limit);

  if (error) return { rows: [], error: error.message };

  const rows: HomeKoreanBizPortalLine[] = (data ?? [])
    .map((r) => {
      const id = String(r.id ?? '').trim();
      const title = String(r.name ?? '').trim();
      if (!id || !title) return null;
      const reg = String(r.region ?? '');
      const cat = String(r.category ?? '');
      const subtitle = [koreanBizRegionLabel(reg, locale), koreanBizCategoryLabel(cat, locale)]
        .filter(Boolean)
        .join(' · ');
      return {
        id,
        title,
        href: `/korean-biz?focus=${encodeURIComponent(id)}`,
        subtitle: subtitle || null,
      };
    })
    .filter((x): x is HomeKoreanBizPortalLine => x != null);

  return { rows, error: null };
}

export type HomeWeeklyThaiRankRow = {
  rank: number;
  profileId: string;
  displayName: string;
  thaiEarned: number;
};

/** 이번 주(서울 기준) 완료된 주간 미션 보상 타이(THAI) 합산 TOP N */
export async function fetchHomeWeeklyThaiRanking(
  limit = 5,
): Promise<{ rows: HomeWeeklyThaiRankRow[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb.rpc('get_public_weekly_dotori_ranking', {
    p_limit: limit,
  });

  if (error) {
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      return { rows: [], error: null };
    }
    return { rows: [], error: error.message };
  }

  const raw = (data ?? []) as {
    rank?: unknown;
    profile_id?: unknown;
    display_name?: unknown;
    dotori_earned?: unknown;
  }[];

  const rows: HomeWeeklyThaiRankRow[] = raw.map((r) => ({
    rank: Number(r.rank ?? 0),
    profileId: String(r.profile_id ?? ''),
    displayName: String(r.display_name ?? '익명'),
    thaiEarned: Number(r.dotori_earned ?? 0),
  }));

  return { rows, error: null };
}

/** 서울 당일 타이(THAI) 획득량 합산 기준 공개 랭킹 TOP N (랭킹 RPC; DB 응답 필드명은 레거시) */
export type HomeTodayThaiEarnRankRow = {
  rank: number;
  profileId: string;
  displayName: string;
  thaiEarnedToday: number;
  /** 실제 RPC가 비었을 때만 워밍업 행 */
  isWarmup?: boolean;
};

async function fetchHomeTodayThaiEarnRankingImpl(
  safeLimit: number,
): Promise<{ rows: HomeTodayThaiEarnRankRow[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb.rpc('get_public_today_dotori_earnings_ranking', {
    p_limit: safeLimit,
  });

  if (error) {
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      return { rows: [], error: null };
    }
    return { rows: [], error: error.message };
  }

  const raw = (data ?? []) as {
    rank?: unknown;
    profile_id?: unknown;
    display_name?: unknown;
    dotori_earned_today?: unknown;
  }[];

  const rows: HomeTodayThaiEarnRankRow[] = raw.map((r) => ({
    rank: Number(r.rank ?? 0),
    profileId: String(r.profile_id ?? ''),
    displayName: String(r.display_name ?? '익명').trim() || '익명',
    thaiEarnedToday: Number(r.dotori_earned_today ?? 0),
  }));

  return { rows: mergeWarmupTodayThaiRanking(rows, safeLimit) as HomeTodayThaiEarnRankRow[], error: null };
}

const getCachedTodayThaiEarnRanking = unstable_cache(
  async (safeLimit: number) => fetchHomeTodayThaiEarnRankingImpl(safeLimit),
  ['home-today-thai-earnings-ranking-v1'],
  { revalidate: 20 },
);

export async function fetchHomeTodayThaiEarnRanking(
  limit = 5,
): Promise<{ rows: HomeTodayThaiEarnRankRow[]; error: string | null }> {
  const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)));
  return getCachedTodayThaiEarnRanking(safeLimit);
}

export type HomeFeaturedPollRow = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
};

function todaySeoulIsoDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** 홈 밸런스 게임 — 당일(서울) 투표 우선, 없으면 최신 1건 */
export async function fetchHomeFeaturedPoll(): Promise<{ row: HomeFeaturedPollRow | null; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { row: null, error: null };

  const day = todaySeoulIsoDate();

  const { data: todayRow, error: e1 } = await sb
    .from('polls')
    .select('id, question, option_a_label, option_b_label')
    .eq('active_on', day)
    .maybeSingle();

  if (e1) return { row: null, error: e1.message };

  let poll = todayRow;

  if (!poll) {
    const { data: latest, error: e2 } = await sb
      .from('polls')
      .select('id, question, option_a_label, option_b_label')
      .order('active_on', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (e2) return { row: null, error: e2.message };
    poll = latest;
  }

  if (!poll || typeof poll.id !== 'string') return { row: null, error: null };

  return {
    row: {
      id: poll.id,
      question: String(poll.question ?? ''),
      optionA: String(poll.option_a_label ?? ''),
      optionB: String(poll.option_b_label ?? ''),
    },
    error: null,
  };
}

export async function fetchHomePersonalizedRecommendations(
  limit = 6,
): Promise<{ rows: HomeRecommendedRow[]; error: string | null }> {
  try {
    const admin = createServiceRoleClient();
    const sinceIso = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
    const safeLimit = Math.max(1, Math.min(12, Math.floor(limit)));

    const { data: uxRows, error: uxError } = await admin
      .from('ux_events')
      .select('session_id, path, event_type')
      .gte('created_at', sinceIso)
      .in('event_type', ['click', 'page_view'])
      .like('path', '/community/boards/%')
      .order('created_at', { ascending: false })
      .limit(4000);
    if (uxError) return { rows: [], error: uxError.message };

    const postStats = new Map<string, { click: number; view: number; sessions: Set<string> }>();
    const idRx = /\/community\/boards\/([0-9a-f-]{36})/i;
    for (const row of uxRows ?? []) {
      const path = String(row.path ?? '');
      const m = idRx.exec(path);
      if (!m?.[1]) continue;
      const postId = m[1].toLowerCase();
      const eventType = String(row.event_type ?? '');
      const sessionId = String(row.session_id ?? '');
      const slot = postStats.get(postId) ?? { click: 0, view: 0, sessions: new Set<string>() };
      if (eventType === 'click') slot.click += 1;
      if (eventType === 'page_view') slot.view += 1;
      if (sessionId) slot.sessions.add(sessionId);
      postStats.set(postId, slot);
    }
    if (postStats.size === 0) return { rows: [], error: null };

    const { data: metricsRows } = await admin
      .from('ux_metrics_5m')
      .select('totals')
      .order('window_start', { ascending: false })
      .limit(12);

    let avgDwellSeconds = 0;
    let dwellSamples = 0;
    for (const row of metricsRows ?? []) {
      const totals = row.totals as { avg_dwell_seconds?: unknown } | null;
      const v = Number(totals?.avg_dwell_seconds ?? 0);
      if (Number.isFinite(v) && v > 0) {
        avgDwellSeconds += v;
        dwellSamples += 1;
      }
    }
    const normalizedDwell = dwellSamples > 0 ? avgDwellSeconds / dwellSamples : 45;
    const dwellFactor = 1 + Math.min(2.2, normalizedDwell / 180);

    const candidates = Array.from(postStats.entries())
      .map(([postId, stat]) => ({
        postId,
        score: (stat.click * 4 + stat.sessions.size * 2 + stat.view * 0.35) * dwellFactor,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, safeLimit * 2);
    if (candidates.length === 0) return { rows: [], error: null };

    const ids = candidates.map((c) => c.postId);
    const { data: posts, error: postError } = await admin
      .from('posts')
      .select('id, title, moderation_status, author_hidden')
      .in('id', ids)
      .eq('moderation_status', 'safe')
      .eq('author_hidden', false);
    if (postError) return { rows: [], error: postError.message };

    const postMap = new Map((posts ?? []).map((p) => [String(p.id), String(p.title ?? '')]));
    const rows: HomeRecommendedRow[] = [];
    for (const c of candidates) {
      const title = postMap.get(c.postId)?.trim();
      if (!title) continue;
      rows.push({
        id: c.postId,
        title,
        href: `/community/boards/${c.postId}`,
        score: Math.round(c.score * 10) / 10,
      });
      if (rows.length >= safeLimit) break;
    }
    return { rows, error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : String(error) };
  }
}

/** 꿀팁 허브와 동일 — `get_tips_public` (파이프라인 승인 글만) */
export async function fetchHomeTipsPublic(
  limit = 8,
): Promise<{ rows: { id: string; title: string; excerpt: string; created_at: string }[]; error: string | null }> {
  const sb = tryCreateCached() ?? tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 8));
  const { data, error } = await sb.rpc('get_tips_public', { limit_n: safeLimit });

  if (error) return { rows: [], error: error.message };

  const rows = (Array.isArray(data) ? data : []) as {
    id: string;
    title: string;
    excerpt: string;
    created_at: string;
  }[];

  return {
    rows: rows.map((r) => ({
      id: String(r.id ?? ''),
      title: String(r.title ?? ''),
      excerpt: String(r.excerpt ?? ''),
      created_at: String(r.created_at ?? ''),
    })),
    error: null,
  };
}

export async function fetchHomeTipsArticles(
  limit = 5,
): Promise<{ rows: HomeTipArticleRow[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('tips_articles')
    .select('id, title, excerpt, published_at, created_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };

  return {
    rows: (data ?? []).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ''),
      excerpt: r.excerpt != null ? String(r.excerpt) : '',
      published_at: r.published_at != null ? String(r.published_at) : null,
      created_at: String(r.created_at ?? ''),
    })),
    error: null,
  };
}

/**
 * 통합 게시판 `board_posts` (자유 free / 정보 info) — `/boards/[id]` 상세와 id 정합
 */
export async function fetchHomeBoardPostsByType(
  boardType: 'free' | 'info',
  limit = 10,
): Promise<{ rows: HomeCommunityPostRow[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('board_posts')
    .select('id, title, created_at, board_type')
    .eq('board_type', boardType)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };

  return {
    rows: (data ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title ?? ''),
      created_at: String(row.created_at ?? ''),
      comment_count: 0,
      view_count: 0,
      category: String(row.board_type ?? boardType),
    })),
    error: null,
  };
}

/** 크론 고스트라이터 등 자동 큐레이션 board_posts — 홈 실시간 피드 상단 병합용 */
export async function fetchAutoCuratedBoardPostsForPortalLive(limit = 10): Promise<
  {
    id: string;
    title: string;
    content: string;
    board_type: string;
    created_at: string;
    home_highlight: boolean;
    display_author_label: string | null;
  }[]
> {
  const sb = tryCreateCached() ?? tryCreate();
  if (!sb) return [];
  const safeLimit = Math.min(40, Math.max(1, Math.floor(Number(limit)) || 10));
  const { data, error } = await sb
    .from('board_posts')
    .select('id, title, content, board_type, created_at, home_highlight, display_author_label')
    .eq('auto_curated', true)
    .eq('home_highlight', true)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    const missing =
      error.message.toLowerCase().includes('column') && error.message.toLowerCase().includes('does not exist');
    if (!missing) {
      console.warn('[fetchAutoCuratedBoardPostsForPortalLive]', error.message);
    }
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    board_type: String(row.board_type ?? ''),
    created_at: String(row.created_at ?? ''),
    home_highlight: Boolean(row.home_highlight),
    display_author_label: row.display_author_label != null ? String(row.display_author_label) : null,
  }));
}

export async function fetchHomePostsByCategory(
  category: 'free' | 'qna' | readonly string[],
  limit = 10,
): Promise<{ rows: HomeCommunityPostRow[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  let q = sb
    .from('posts')
    .select('id, title, created_at, comment_count, view_count, category')
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .eq('is_knowledge_tip', false);
  q = Array.isArray(category) ? q.in('category', [...category]) : q.eq('category', category);

  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);

  if (error) return { rows: [], error: error.message };

  return {
    rows: (data ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title ?? ''),
      created_at: String(row.created_at ?? ''),
      comment_count: Number(row.comment_count ?? 0),
      view_count: Number(row.view_count ?? 0),
      category: String(row.category ?? ''),
    })),
    error: null,
  };
}

export async function fetchHomeRealtimeBestPosts(limit = 5): Promise<{
  rows: HomeCommunityPostRow[];
  error: string | null;
}> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const since = new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString();
  const { data, error } = await sb
    .from('posts')
    .select('id, title, created_at, comment_count, view_count, category')
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .gte('created_at', since)
    .order('view_count', { ascending: false })
    .order('comment_count', { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };
  return {
    rows: (data ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title ?? ''),
      created_at: String(row.created_at ?? ''),
      comment_count: Number(row.comment_count ?? 0),
      view_count: Number(row.view_count ?? 0),
      category: String(row.category ?? ''),
    })),
    error: null,
  };
}

export async function fetchHomeRecentCommentTicker(limit = 6): Promise<{
  rows: HomeCommunityPostRow[];
  error: string | null;
}> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('posts')
    .select('id, title, created_at, comment_count, view_count, category')
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .gt('comment_count', 0)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };
  return {
    rows: (data ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title ?? ''),
      created_at: String(row.created_at ?? ''),
      comment_count: Number(row.comment_count ?? 0),
      view_count: Number(row.view_count ?? 0),
      category: String(row.category ?? ''),
    })),
    error: null,
  };
}

/** 게시판 전 카테고리(공개 안전 글) — 하단 무한 피드 */
export async function fetchHomeFeedPosts(
  limit: number,
  opts?: { beforeIso?: string | null; sb?: SupabaseClient | null },
): Promise<{ rows: PortalPostRow[]; error: string | null }> {
  const sb = opts?.sb ?? tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  let q = sb
    .from('posts')
    .select(POST_COLS)
    .eq('moderation_status', 'safe')
    .eq('is_knowledge_tip', false)
    .eq('author_hidden', false)
    .in('category', ['free', 'info', 'restaurant', 'flea', 'job'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts?.beforeIso) {
    const d = new Date(opts.beforeIso);
    if (!Number.isNaN(d.getTime())) {
      q = q.lt('created_at', d.toISOString());
    }
  }

  const { data, error } = await q;
  if (error) return { rows: [], error: error.message };

  const rows = (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ''),
    excerpt: row.excerpt != null ? String(row.excerpt) : null,
    content: row.content != null ? String(row.content) : null,
    category: String(row.category ?? ''),
    created_at: String(row.created_at ?? ''),
    comment_count: row.comment_count != null ? Number(row.comment_count) : null,
    view_count: row.view_count != null ? Number(row.view_count) : null,
    image_urls: Array.isArray(row.image_urls) ? (row.image_urls as string[]) : null,
  }));

  return { rows, error: null };
}

/** 통합 피드 RPC — 실패 시 posts 전용 폴백(마이그레이션 미적용 환경) */
export async function fetchHomeUnifiedFeed(
  limit: number,
  cursor?: { createdAt: string; id: string } | null,
): Promise<{ rows: HomeUnifiedFeedItem[]; error: string | null }> {
  const sb = tryCreateCached() ?? tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb.rpc('get_home_unified_feed', {
    limit_n: limit,
    cursor_created_at: cursor?.createdAt ?? null,
    cursor_id: cursor?.id ?? null,
  });

  if (error) {
    const missing = error.message.includes('function') && error.message.includes('does not exist');
    if (!missing) {
      return { rows: [], error: error.message };
    }
    const fb = await fetchHomeFeedPosts(limit, { beforeIso: cursor?.createdAt ?? null, sb });
    if (fb.error) return { rows: [], error: fb.error };
    return { rows: fb.rows.map(mapPortalRowToUnified), error: null };
  }

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows = raw.map((r) => mapUnifiedRpcRow(r));
  return { rows, error: null };
}

export async function fetchHomeUxSnapshot(): Promise<{
  window_start: string | null;
  totals: UxTotalsPublic | null;
  error: string | null;
}> {
  const sb = tryCreate();
  if (!sb) return { window_start: null, totals: null, error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb.rpc('get_public_ux_metrics_latest');
  if (error) {
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      return {
        window_start: null,
        totals: null,
        error: 'RPC 미적용: supabase/migrations/113_public_ux_metrics_latest_rpc.sql 배포 후 갱신됩니다.',
      };
    }
    return { window_start: null, totals: null, error: error.message };
  }

  const row = Array.isArray(data) ? (data[0] as { window_start?: string; totals?: UxTotalsPublic } | undefined) : null;
  if (!row) return { window_start: null, totals: null, error: null };

  return {
    window_start: row.window_start ?? null,
    totals: row.totals && typeof row.totals === 'object' ? row.totals : null,
    error: null,
  };
}

/** 포털 급상승 검색어 — `portal_trending_search_queries` (마이그레이션 146) */
export type PortalTrendingKeywordRow = {
  rank: number;
  query: string;
  count: number;
};

export async function fetchPortalTrendingKeywords(limit = 10): Promise<PortalTrendingKeywordRow[]> {
  const sb = tryCreateCached() ?? tryCreate();
  if (!sb) return [];
  const lim = Math.min(Math.max(Math.floor(limit), 1), 50);
  const { data, error } = await sb.rpc('portal_trending_search_queries', {
    p_hours: 48,
    p_limit: lim,
  });
  if (error || !Array.isArray(data)) return [];
  const out: PortalTrendingKeywordRow[] = [];
  for (const raw of data as Record<string, unknown>[]) {
    const query = String(raw.query ?? '').trim();
    if (!query) continue;
    out.push({
      rank: Number(raw.rank ?? out.length + 1),
      query,
      count: Number(raw.cnt ?? raw.count ?? 0),
    });
  }
  return out;
}

/** 포털 「지금 태국은?」 이미지 스트립 — `portal_recent_photo_strip` */
export type PortalThailandPhotoStripItem = {
  href: string;
  thumbUrl: string;
  title: string;
};

export async function fetchPortalThailandPhotoStrip(limit = 10): Promise<PortalThailandPhotoStripItem[]> {
  const sb = tryCreateCached() ?? tryCreate();
  if (!sb) return [];
  const lim = Math.min(Math.max(Math.floor(limit), 1), 30);
  const { data, error } = await sb.rpc('portal_recent_photo_strip', { p_limit: lim });
  if (error || !Array.isArray(data)) return [];
  const out: PortalThailandPhotoStripItem[] = [];
  for (const raw of data as Record<string, unknown>[]) {
    const source = String(raw.source ?? '').trim();
    const id = String(raw.post_id ?? '').trim();
    const thumbUrl = String(raw.thumb_url ?? '').trim();
    const title = String(raw.title ?? '').trim();
    if (!id || !thumbUrl) continue;
    const href =
      source === 'board'
        ? `/boards/${encodeURIComponent(id)}`
        : `/community/boards/${encodeURIComponent(id)}`;
    out.push({ href, thumbUrl, title: title || 'photo' });
  }
  return out;
}

export type CollaborativeMissionRow = {
  id: string;
  scope: string;
  title: string;
  body: string;
  goalTarget: number;
  goalCurrent: number;
  rewardThai: number;
};

/** 서울 달력 기준 활성 창에 걸린 공동 미션 */
export async function fetchCollaborativeMissionsActive(): Promise<{
  rows: CollaborativeMissionRow[];
  error: string | null;
}> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: null };
  const day = todaySeoulIsoDate();
  const { data, error } = await sb
    .from('collaborative_missions')
    .select('id, scope, title, body, goal_target, goal_current, reward_dotori, starts_on, ends_on')
    .lte('starts_on', day)
    .gte('ends_on', day)
    .order('scope', { ascending: true });

  if (error) {
    if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
      return { rows: [], error: null };
    }
    return { rows: [], error: error.message };
  }

  const rows: CollaborativeMissionRow[] = (data ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: String(x.id ?? ''),
      scope: String(x.scope ?? ''),
      title: String(x.title ?? ''),
      body: String(x.body ?? ''),
      goalTarget: Number(x.goal_target ?? 0),
      goalCurrent: Number(x.goal_current ?? 0),
      rewardThai: Number(x.reward_dotori ?? 0),
    };
  });

  return { rows, error: null };
}
