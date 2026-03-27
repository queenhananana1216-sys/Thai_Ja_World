import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { getSiteBaseUrl } from '@/lib/seo/site';

/**
 * Discovery (sitemap) + Control (robots.txt) 상호보완
 * - 여기 URL은 크롤러에게 “이 페이지들을 우선 발견해라”는 강한 힌트입니다.
 * - 실제 색인·크롤 허용은 robots.txt·페이지 메타와 함께 맞춥니다.
 * - 다국어: 현재 라우트는 쿠키 기반 로케일이라 URL이 언어별로 갈라지지 않습니다.
 *   /ko/… /th/… 경로를 도입하면 alternates.languages 를 같은 엔트리에 붙이는 것이 좋습니다.
 */
const MAX_NEWS = 800;
const MAX_POSTS = 800;
const MAX_MINIHOMES = 400;

/** 뉴스·게시 반영 — 커뮤니티 우선 전략에 맞춰 30분 */
export const revalidate = 1800;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl();
  const fallback = new Date();

  /** 커뮤니티 허브·거래 허브를 홈 직후에 두어 발견 가중치를 높임 */
  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: fallback, changeFrequency: 'daily', priority: 1 },
    {
      url: `${base}/community/boards`,
      lastModified: fallback,
      changeFrequency: 'hourly',
      priority: 0.99,
    },
    {
      url: `${base}/community/trade`,
      lastModified: fallback,
      changeFrequency: 'daily',
      priority: 0.93,
    },
    { url: `${base}/local`, lastModified: fallback, changeFrequency: 'weekly', priority: 0.78 },
    { url: `${base}/minihome`, lastModified: fallback, changeFrequency: 'weekly', priority: 0.62 },
  ];

  const postsEntries: MetadataRoute.Sitemap = [];
  const newsEntries: MetadataRoute.Sitemap = [];
  const minihomeEntries: MetadataRoute.Sitemap = [];

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

    for (const row of postsRes.data ?? []) {
      const id = row.id as string;
      const ts = row.updated_at ? new Date(row.updated_at as string) : fallback;
      postsEntries.push({
        url: `${base}/community/boards/${id}`,
        lastModified: ts,
        changeFrequency: 'weekly',
        priority: 0.86,
      });
    }

    for (const row of newsRes.data ?? []) {
      const id = row.id as string;
      const ts = row.created_at ? new Date(row.created_at as string) : fallback;
      newsEntries.push({
        url: `${base}/news/${id}`,
        lastModified: ts,
        changeFrequency: 'daily',
        priority: 0.76,
      });
    }

    for (const row of homesRes.data ?? []) {
      const slug = row.public_slug as string;
      if (!slug) continue;
      const ts = row.updated_at ? new Date(row.updated_at as string) : fallback;
      minihomeEntries.push({
        url: `${base}/minihome/${encodeURIComponent(slug)}`,
        lastModified: ts,
        changeFrequency: 'monthly',
        priority: 0.52,
      });
    }
  } catch {
    // Supabase 미설정·일시 오류 시 정적 URL만
  }

  /** 동적 구간: 커뮤니티 게시 → 뉴스 → 미니홈 순 (배열 앞쪽이 상대적으로 먼저 노출되는 클라이언트가 많음) */
  return [...staticEntries, ...postsEntries, ...newsEntries, ...minihomeEntries];
}
