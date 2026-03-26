import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase/server';

/** 공개 URL 기준 — Search Console·OG와 맞춤 */
function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  return 'https://thaijaworld.com';
}

/** 동적 항목 상한 (사이트맵 단일 파일 권장 범위 내) */
const MAX_NEWS = 800;
const MAX_POSTS = 800;
const MAX_MINIHOMES = 400;

/** 1시간마다 재검증 (뉴스·게시 갱신 반영) */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl();
  const fallback = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: fallback, changeFrequency: 'daily', priority: 1 },
    {
      url: `${base}/community/boards`,
      lastModified: fallback,
      changeFrequency: 'hourly',
      priority: 0.95,
    },
    {
      url: `${base}/community/trade`,
      lastModified: fallback,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    { url: `${base}/local`, lastModified: fallback, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/minihome`, lastModified: fallback, changeFrequency: 'weekly', priority: 0.65 },
  ];

  const dynamic: MetadataRoute.Sitemap = [];

  try {
    const supabase = createServerClient();

    const [newsRes, postsRes, homesRes] = await Promise.all([
      supabase
        .from('processed_news')
        .select('id, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(MAX_NEWS),
      supabase
        .from('posts')
        .select('id, updated_at')
        .eq('moderation_status', 'safe')
        .order('updated_at', { ascending: false })
        .limit(MAX_POSTS),
      supabase
        .from('user_minihomes')
        .select('public_slug, updated_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(MAX_MINIHOMES),
    ]);

    for (const row of newsRes.data ?? []) {
      const id = row.id as string;
      const ts = row.created_at ? new Date(row.created_at as string) : fallback;
      dynamic.push({
        url: `${base}/news/${id}`,
        lastModified: ts,
        changeFrequency: 'daily',
        priority: 0.78,
      });
    }

    for (const row of postsRes.data ?? []) {
      const id = row.id as string;
      const ts = row.updated_at ? new Date(row.updated_at as string) : fallback;
      dynamic.push({
        url: `${base}/community/boards/${id}`,
        lastModified: ts,
        changeFrequency: 'weekly',
        priority: 0.72,
      });
    }

    for (const row of homesRes.data ?? []) {
      const slug = row.public_slug as string;
      if (!slug) continue;
      const ts = row.updated_at ? new Date(row.updated_at as string) : fallback;
      dynamic.push({
        url: `${base}/minihome/${encodeURIComponent(slug)}`,
        lastModified: ts,
        changeFrequency: 'monthly',
        priority: 0.55,
      });
    }
  } catch {
    // Supabase 미설정·일시 오류 시 정적 URL만 제공
  }

  return [...staticEntries, ...dynamic];
}
