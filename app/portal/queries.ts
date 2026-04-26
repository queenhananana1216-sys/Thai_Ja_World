/**
 * 포털 데이터 로더 (Server-only)
 *
 * - 구인구직: `public.jobs`
 * - 번개장터: `public.market`
 * - 하단 피드: `posts` (category in info, free)
 */
import 'server-only';

import { createServerClient } from '@/lib/supabase/server';
import type {
  JobPost,
  MarketPost,
  PopularPostRow,
  PortalFxSnapshot,
  PortalPostRow,
  PortalWeatherSnapshot,
  PremiumBannerRow,
} from './types';

function tryCreateServerClient() {
  try {
    return createServerClient();
  } catch {
    return null;
  }
}

const POST_LIST_COLUMNS =
  'id, title, excerpt, content, category, created_at, comment_count, view_count, image_urls, author_hidden, moderation_status, is_knowledge_tip' as const;

const JOB_COLUMNS =
  'id, title, content, excerpt, author_id, created_at, updated_at, salary, salary_period, company_name, location, employment_type, visa_requirement, contact_hint, image_urls, moderation_status, author_hidden' as const;

const MARKET_COLUMNS =
  'id, title, content, excerpt, author_id, created_at, updated_at, price_amount, price_currency, price_display, item_condition, status, location, image_urls, moderation_status, author_hidden' as const;

function mapJobRow(row: Record<string, unknown>): JobPost {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    excerpt: row.excerpt != null ? String(row.excerpt) : null,
    author_id: String(row.author_id ?? ''),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    salary: row.salary != null ? String(row.salary) : null,
    salary_period: String(row.salary_period ?? 'negotiable'),
    company_name: row.company_name != null ? String(row.company_name) : null,
    location: row.location != null ? String(row.location) : null,
    employment_type: String(row.employment_type ?? 'other'),
    visa_requirement: row.visa_requirement != null ? String(row.visa_requirement) : null,
    contact_hint: row.contact_hint != null ? String(row.contact_hint) : null,
    image_urls: Array.isArray(row.image_urls) ? (row.image_urls as string[]) : null,
    moderation_status: String(row.moderation_status ?? 'safe'),
    author_hidden: Boolean(row.author_hidden),
  };
}

function mapMarketRow(row: Record<string, unknown>): MarketPost {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    excerpt: row.excerpt != null ? String(row.excerpt) : null,
    author_id: String(row.author_id ?? ''),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    price_amount: row.price_amount != null && row.price_amount !== '' ? Number(row.price_amount) : null,
    price_currency: String(row.price_currency ?? 'THB'),
    price_display: row.price_display != null ? String(row.price_display) : null,
    item_condition: String(row.item_condition ?? 'good'),
    status: String(row.status ?? 'available'),
    location: row.location != null ? String(row.location) : null,
    image_urls: Array.isArray(row.image_urls) ? (row.image_urls as string[]) : null,
    moderation_status: String(row.moderation_status ?? 'safe'),
    author_hidden: Boolean(row.author_hidden),
  };
}

/** 구인구직 — `public.jobs` */
export async function fetchPortalJobPosts(limit = 8): Promise<{ rows: JobPost[]; error: string | null }> {
  const sb = tryCreateServerClient();
  if (!sb) {
    return { rows: [], error: 'Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)가 없습니다.' };
  }

  const { data, error } = await sb
    .from('jobs')
    .select(JOB_COLUMNS)
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data ?? []).map((r) => mapJobRow(r as Record<string, unknown>)), error: null };
}

/** 번개장터 — `public.market` */
export async function fetchPortalMarketPosts(limit = 8): Promise<{ rows: MarketPost[]; error: string | null }> {
  const sb = tryCreateServerClient();
  if (!sb) {
    return { rows: [], error: 'Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)가 없습니다.' };
  }

  const { data, error } = await sb
    .from('market')
    .select(MARKET_COLUMNS)
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .in('status', ['available', 'reserved', 'sold'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data ?? []).map((r) => mapMarketRow(r as Record<string, unknown>)), error: null };
}

export async function fetchJobById(id: string): Promise<{ row: JobPost | null; error: string | null }> {
  const sb = tryCreateServerClient();
  if (!sb) {
    return { row: null, error: 'Supabase 클라이언트를 만들 수 없습니다.' };
  }
  const { data, error } = await sb.from('jobs').select(JOB_COLUMNS).eq('id', id).maybeSingle();
  if (error) return { row: null, error: error.message };
  if (!data) return { row: null, error: null };
  return { row: mapJobRow(data as Record<string, unknown>), error: null };
}

export async function fetchMarketById(id: string): Promise<{ row: MarketPost | null; error: string | null }> {
  const sb = tryCreateServerClient();
  if (!sb) {
    return { row: null, error: 'Supabase 클라이언트를 만들 수 없습니다.' };
  }
  const { data, error } = await sb.from('market').select(MARKET_COLUMNS).eq('id', id).maybeSingle();
  if (error) return { row: null, error: error.message };
  if (!data) return { row: null, error: null };
  return { row: mapMarketRow(data as Record<string, unknown>), error: null };
}

/** 정보공유·자유게시판 피드 — `posts.category` in info, free */
export async function fetchPortalFeedPosts(
  limit: number,
  opts?: { beforeIso?: string | null },
): Promise<{ rows: PortalPostRow[]; error: string | null }> {
  const sb = tryCreateServerClient();
  if (!sb) {
    return { rows: [], error: 'Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)가 없습니다.' };
  }

  let q = sb
    .from('posts')
    .select(POST_LIST_COLUMNS)
    .eq('moderation_status', 'safe')
    .eq('is_knowledge_tip', false)
    .eq('author_hidden', false)
    .in('category', ['info', 'free'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts?.beforeIso) {
    const d = new Date(opts.beforeIso);
    if (!Number.isNaN(d.getTime())) {
      q = q.lt('created_at', d.toISOString());
    }
  }

  const { data, error } = await q;
  if (error) {
    return { rows: [], error: error.message };
  }

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

export async function fetchPopularTrendingRows(
  limitN = 12,
  daysBack = 14,
): Promise<{ rows: PopularPostRow[]; error: string | null }> {
  const sb = tryCreateServerClient();
  if (!sb) {
    return { rows: [], error: 'Supabase 클라이언트를 만들 수 없습니다.' };
  }

  const { data, error } = await sb.rpc('get_popular_posts', {
    limit_n: limitN,
    days_back: daysBack,
  });

  if (error) {
    return { rows: [], error: error.message };
  }

  const rows = (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id ?? ''),
    title: String(r.title ?? ''),
    author_name: String(r.author_name ?? ''),
    category: String(r.category ?? ''),
    reaction_count: Number(r.reaction_count ?? 0),
    comment_count: Number(r.comment_count ?? 0),
    view_count: Number(r.view_count ?? 0),
    created_at: String(r.created_at ?? ''),
  }));

  return { rows, error: null };
}

export async function fetchPortalHeroBanners(): Promise<{ rows: PremiumBannerRow[]; error: string | null }> {
  const sb = tryCreateServerClient();
  if (!sb) {
    return { rows: [], error: 'Supabase 클라이언트를 만들 수 없습니다.' };
  }

  const { data, error } = await sb
    .from('premium_banners')
    .select('id, slot, title, subtitle, image_url, href, badge_text, sort_order')
    .eq('slot', 'portal_hero')
    .order('sort_order', { ascending: true });

  if (error) {
    return { rows: [], error: error.message };
  }

  const rows = (data ?? []).map((b) => ({
    id: String(b.id),
    slot: String(b.slot ?? ''),
    title: String(b.title ?? ''),
    subtitle: b.subtitle != null ? String(b.subtitle) : null,
    image_url: b.image_url != null ? String(b.image_url) : null,
    href: b.href != null ? String(b.href) : null,
    badge_text: b.badge_text != null ? String(b.badge_text) : null,
    sort_order: Number(b.sort_order ?? 0),
  }));

  return { rows, error: null };
}

/** Open-Meteo (키 없음) — 실패 시 null */
export async function fetchBangkokWeather(): Promise<PortalWeatherSnapshot | null> {
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,relative_humidity_2m,weather_code';
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number };
    };
    const cur = json.current;
    if (!cur || typeof cur.temperature_2m !== 'number') return null;
    const code = cur.weather_code ?? 0;
    const conditionKo = weatherCodeToKo(code);
    return {
      tempC: Math.round(cur.temperature_2m),
      humidityPct: typeof cur.relative_humidity_2m === 'number' ? Math.round(cur.relative_humidity_2m) : null,
      conditionKo,
      city: '방콕',
    };
  } catch {
    return null;
  }
}

function weatherCodeToKo(code: number): string {
  if (code === 0) return '맑음';
  if (code <= 3) return '구름 많음';
  if (code <= 48) return '안개';
  if (code <= 67) return '비';
  if (code <= 77) return '눈';
  if (code <= 82) return '소나기';
  return '변동';
}

/** 환율 표시 — 운영자가 Vercel/Supabase 외부에서 주입 (선택). DB 테이블 없이도 동작 */
export function readPortalFxFromEnv(): PortalFxSnapshot {
  const thbKrw = process.env.NEXT_PUBLIC_PORTAL_FX_THB_KRW?.trim() || null;
  const usdThb = process.env.NEXT_PUBLIC_PORTAL_FX_USD_THB?.trim() || null;
  const usdKrw = process.env.NEXT_PUBLIC_PORTAL_FX_USD_KRW?.trim() || null;
  const updatedLabel = process.env.NEXT_PUBLIC_PORTAL_FX_UPDATED?.trim() || null;
  return { thbKrw, usdThb, usdKrw, updatedLabel };
}
