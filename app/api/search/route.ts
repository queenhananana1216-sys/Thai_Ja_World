/**
 * 통합 검색 (Omni-Search) — 한인 업소 · 뉴스 · 커뮤니티 게시글
 * 원문 부분 일치 + 한글 초성열 부분 일치 (예: ㅂㅋ → 방콕)
 */
import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { matchesHangulOrChosung } from '@/lib/utils/hangul';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function clampLimit(raw: unknown, fallback: number, max: number): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(n)));
}

type KoreanBizRow = {
  id: string;
  google_place_id: string;
  name: string;
  category: string;
  region: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  last_verified_at: string | null;
};

type NewsRow = {
  id: string;
  title_kr: string | null;
  title_th: string | null;
  content_kr: string | null;
  clean_body: string | null;
  created_at: string;
};

type PostRow = {
  id: string;
  board_type: string;
  title: string;
  content: string;
  created_at: string;
  image_urls: string[];
};

function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

function truncateBody(s: string | null | undefined, max: number): string | null {
  if (s == null || !s.trim()) return null;
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

async function runOmniSearchQuery(qRaw: string, limit: number) {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
  const sb = createClient(sbUrl, sbKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const pa = `%${escapeIlike(qRaw)}%`;

  const [
    bizIlike,
    bizRecent,
    newsIlike,
    newsRecent,
    postsIlike,
    postsRecent,
  ] = await Promise.all([
    sb
      .from('korean_businesses')
      .select(
        'id, google_place_id, name, category, region, address, phone, latitude, longitude, is_verified, last_verified_at',
      )
      .or(`name.ilike.${pa},address.ilike.${pa},phone.ilike.${pa}`)
      .limit(limit),
    sb
      .from('korean_businesses')
      .select(
        'id, google_place_id, name, category, region, address, phone, latitude, longitude, is_verified, last_verified_at',
      )
      .order('last_verified_at', { ascending: false, nullsFirst: false })
      .limit(400),
    sb
      .from('processed_news')
      .select('id, title_kr, title_th, content_kr, clean_body, created_at')
      .eq('published', true)
      .or(`title_kr.ilike.${pa},title_th.ilike.${pa},content_kr.ilike.${pa},clean_body.ilike.${pa}`)
      .limit(limit),
    sb
      .from('processed_news')
      .select('id, title_kr, title_th, content_kr, clean_body, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(350),
    sb
      .from('board_posts')
      .select('id, board_type, title, content, created_at, image_urls')
      .or(`title.ilike.${pa},content.ilike.${pa},address.ilike.${pa}`)
      .limit(limit),
    sb
      .from('board_posts')
      .select('id, board_type, title, content, created_at, image_urls')
      .order('created_at', { ascending: false })
      .limit(350),
  ]);

  const errors: string[] = [];
  if (bizIlike.error) errors.push(`businesses_ilike: ${bizIlike.error.message}`);
  if (bizRecent.error) errors.push(`businesses_recent: ${bizRecent.error.message}`);
  if (newsIlike.error) errors.push(`news_ilike: ${newsIlike.error.message}`);
  if (newsRecent.error) errors.push(`news_recent: ${newsRecent.error.message}`);
  if (postsIlike.error) errors.push(`posts_ilike: ${postsIlike.error.message}`);
  if (postsRecent.error) errors.push(`posts_recent: ${postsRecent.error.message}`);

  const bizFromRecent =
    bizRecent.data?.filter((row) => {
      const r = row as KoreanBizRow;
      return matchesHangulOrChosung([r.name, r.address ?? '', r.phone ?? ''], qRaw);
    }) ?? [];

  const businesses = dedupeById<KoreanBizRow>([
    ...((bizIlike.data ?? []) as KoreanBizRow[]),
    ...bizFromRecent,
  ])
    .slice(0, limit)
    .sort((a, b) => {
      const ta = a.last_verified_at ?? '';
      const tb = b.last_verified_at ?? '';
      return tb.localeCompare(ta);
    });

  const newsFromRecent =
    newsRecent.data?.filter((row) => {
      const r = row as NewsRow;
      const blob = [r.title_kr, r.title_th, r.content_kr, r.clean_body].filter(Boolean) as string[];
      return matchesHangulOrChosung(blob, qRaw);
    }) ?? [];

  const newsCombined = dedupeById<NewsRow>([
    ...((newsIlike.data ?? []) as NewsRow[]),
    ...newsFromRecent,
  ])
    .slice(0, limit)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const news = newsCombined.map((r) => ({
    id: r.id,
    title_kr: r.title_kr,
    title_th: r.title_th,
    snippet: truncateBody(r.clean_body ?? r.content_kr, 220),
    created_at: r.created_at,
  }));

  const postsFromRecent =
    postsRecent.data?.filter((row) => {
      const r = row as PostRow;
      return matchesHangulOrChosung([r.title, r.content], qRaw);
    }) ?? [];

  const postsCombined = dedupeById<PostRow>([
    ...((postsIlike.data ?? []) as PostRow[]),
    ...postsFromRecent,
  ])
    .slice(0, limit)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const posts = postsCombined.map((r) => ({
    id: r.id,
    board_type: r.board_type,
    title: r.title,
    snippet: truncateBody(r.content, 200),
    created_at: r.created_at,
    image_urls: Array.isArray(r.image_urls) ? r.image_urls.slice(0, 3) : [],
  }));

  return {
    businesses,
    news,
    posts,
    meta: {
      query: qRaw,
      limit,
      ...(errors.length ? { warnings: errors } : {}),
    },
  };
}

const runOmniSearchCached = unstable_cache(runOmniSearchQuery, ['api-omni-search-v1'], { revalidate: 30 });

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const qRaw = url.searchParams.get('q')?.trim() ?? '';
  const limit = clampLimit(url.searchParams.get('limit'), 20, 50);

  if (!qRaw) {
    return NextResponse.json(
      { businesses: [], news: [], posts: [], meta: { query: '', limit } },
      { status: 200 },
    );
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!sbUrl || !sbKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const payload = await runOmniSearchCached(qRaw, limit);
  return NextResponse.json(payload);
}
