/**
 * 홈 커뮤니티 허브 — Server-only 로더.
 * 공개 데이터만: `cookies()` / `@supabase/ssr` 미사용, `@supabase/supabase-js` anon 단일 클라이언트.
 *
 * 참고: 구인·번개는 과거 `posts(job|flea)`에서 `jobs`·`market`으로 분리됨(083).
 */
import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { titleAndSummaryFromProcessed } from '@/lib/news/processedNewsDisplay';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { JobPost, MarketPost, PortalPostRow, PremiumBannerRow } from '../../portal/types';
import type { LocalBusiness } from '@/types/taeworld';
import type { HomeUnifiedFeedItem } from './home-feed-types';

export type { HomeUnifiedFeedItem } from './home-feed-types';

const PUBLIC_FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), PUBLIC_FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(tid));
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

function tryCreate(): SupabaseClient | null {
  return createPublicAnonClient();
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

  const { data, error } = await sb
    .from('processed_news')
    .select('id, clean_body, raw_news(title), summaries(summary_text, model)')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { titles: [], error: error.message };

  const titles: string[] = [];
  for (const pn of data ?? []) {
    const rn = pn.raw_news as { title?: string } | null;
    const sums = pn.summaries as { summary_text: string; model: string | null }[] | null;
    const { title } = titleAndSummaryFromProcessed(
      (pn.clean_body as string | null) ?? null,
      rn?.title ?? null,
      sums ?? null,
      'ko',
    );
    if (title?.trim()) titles.push(title.trim());
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

export async function fetchHomeNewsDigest(limit = 5): Promise<{ rows: HomeNewsRow[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('processed_news')
    .select('id, clean_body, raw_news(title), summaries(summary_text, model)')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };

  const rows: HomeNewsRow[] = [];
  for (const pn of data ?? []) {
    const id = String(pn.id);
    const rn = pn.raw_news as { title?: string } | null;
    const sums = pn.summaries as { summary_text: string; model: string | null }[] | null;
    const { title, summary_text } = titleAndSummaryFromProcessed(
      (pn.clean_body as string | null) ?? null,
      rn?.title ?? null,
      sums ?? null,
      'ko',
    );
    const t = (title ?? '').trim();
    if (!t) continue;
    rows.push({
      id,
      title: t,
      summary: (summary_text ?? '').trim(),
      href: `/news/${id}`,
    });
  }

  return { rows, error: null };
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

export async function fetchHomePostsByCategory(
  category: 'free' | 'qna',
  limit = 10,
): Promise<{ rows: HomeCommunityPostRow[]; error: string | null }> {
  const sb = tryCreate();
  if (!sb) return { rows: [], error: 'Supabase 환경 변수가 없습니다.' };

  const { data, error } = await sb
    .from('posts')
    .select('id, title, created_at, comment_count, view_count, category')
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .eq('is_knowledge_tip', false)
    .eq('category', category)
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
  opts?: { beforeIso?: string | null },
): Promise<{ rows: PortalPostRow[]; error: string | null }> {
  const sb = tryCreate();
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
  const sb = tryCreate();
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
    const fb = await fetchHomeFeedPosts(limit, { beforeIso: cursor?.createdAt ?? null });
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
