import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { getSiteBaseUrl } from '@/lib/seo/site';

/**
 * Discovery (sitemap) + Control (robots.txt) 상호보완
 * - 여기 URL은 크롤러에게 “이 페이지들을 우선 발견해라”는 강한 힌트입니다.
 * - 실제 색인·크롤 허용은 robots.txt·페이지 메타와 함께 맞춥니다.
 * - 다국어: 현재 라우트는 쿠키 기반 로케일이라 URL이 언어별로 갈라지지 않습니다.
 *   /ko/… /th/… 경로를 도입하면 alternates.languages 를 같은 엔트리에 붙이는 것이 좋습니다.
 * - 뉴스: `processed_news` ko+th 동시 색인, 상위 N건은 `changeFrequency: hourly`.
 * - 커뮤니티: 꿀팁(`is_knowledge_tip`)은 `/tips/[id]` 로 분기해 발견 가중치를 줍니다.
 */
const MAX_NEWS = 1000;
const MAX_POSTS = 1200;
const MAX_BOARD_POSTS = 2000;
const MAX_MINIHOMES = 400;
const MAX_LOCAL_SPOTS = 500;
/** 신규 기사·게시 상위 구간 — 크롤러에 더 자주 바뀐다고 알림 */
const NEWS_HOT_CAP = 120;
const POSTS_HOT_CAP = 200;

/**
 * 동적 사이트맵 재생성 주기(초) — 짧을수록 Search Console·봇이 최신 URL을 빨리 받음.
 * (구글 색인 속도는 여전히 크롤 예산·품질에 좌우됩니다.)
 */
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl();
  const fallback = new Date();

  /** 커뮤니티 허브·거래 허브를 홈 직후에 두어 발견 가중치를 높임 */
  const staticEntries: MetadataRoute.Sitemap = [
    /** 홈 — 포털·타이(THAI) 랭킹 등 실시간 블록 포함 → 크롤러에 갱신 신호 */
    { url: base, lastModified: fallback, changeFrequency: 'hourly', priority: 1 },
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
    { url: `${base}/news`, lastModified: fallback, changeFrequency: 'hourly', priority: 0.88 },
    {
      url: `${base}/korean-biz`,
      lastModified: fallback,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    { url: `${base}/boards`, lastModified: fallback, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/tips`, lastModified: fallback, changeFrequency: 'daily', priority: 0.81 },
    {
      url: `${base}/weather`,
      lastModified: fallback,
      changeFrequency: 'hourly',
      priority: 0.72,
    },
    { url: `${base}/local`, lastModified: fallback, changeFrequency: 'weekly', priority: 0.78 },
    { url: `${base}/minihome`, lastModified: fallback, changeFrequency: 'weekly', priority: 0.62 },
    { url: `${base}/terms`, lastModified: fallback, changeFrequency: 'yearly', priority: 0.35 },
    { url: `${base}/privacy`, lastModified: fallback, changeFrequency: 'yearly', priority: 0.35 },
    { url: `${base}/contact`, lastModified: fallback, changeFrequency: 'yearly', priority: 0.35 },
    { url: `${base}/ads`, lastModified: fallback, changeFrequency: 'yearly', priority: 0.35 },
  ];

  const postsEntries: MetadataRoute.Sitemap = [];
  const boardPostsEntries: MetadataRoute.Sitemap = [];
  const newsEntries: MetadataRoute.Sitemap = [];
  const minihomeEntries: MetadataRoute.Sitemap = [];
  const localSpotEntries: MetadataRoute.Sitemap = [];

  try {
    const supabase = createServerClient();

    const [newsRes, postsRes, boardPostsRes, homesRes, localSpotsRes] = await Promise.all([
      supabase
        .from('processed_news')
        .select('id, created_at, language')
        .eq('published', true)
        .in('language', ['ko', 'th'])
        .order('created_at', { ascending: false })
        .limit(MAX_NEWS),
      supabase
        .from('posts')
        .select('id, updated_at, is_knowledge_tip, category')
        .eq('moderation_status', 'safe')
        .eq('author_hidden', false)
        .order('updated_at', { ascending: false })
        .limit(MAX_POSTS),
      supabase
        .from('board_posts')
        .select('id, updated_at')
        .order('updated_at', { ascending: false })
        .limit(MAX_BOARD_POSTS),
      supabase
        .from('user_minihomes')
        .select('public_slug, updated_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(MAX_MINIHOMES),
      supabase
        .from('local_spots')
        .select('slug, minihome_public_slug, updated_at')
        .eq('is_published', true)
        .order('updated_at', { ascending: false })
        .limit(MAX_LOCAL_SPOTS),
    ]);

    const postsRows = postsRes.data ?? [];
    for (let i = 0; i < postsRows.length; i++) {
      const row = postsRows[i]!;
      const id = row.id as string;
      const ts = row.updated_at ? new Date(row.updated_at as string) : fallback;
      const isTip =
        Boolean((row as { is_knowledge_tip?: boolean }).is_knowledge_tip) &&
        String((row as { category?: string }).category ?? '') === 'info';
      const hot = i < POSTS_HOT_CAP;
      /** 꿀팁 허브 전용 URL — canonical은 각 페이지에서 정리 */
      const path = isTip ? `/tips/${encodeURIComponent(id)}` : `/community/boards/${encodeURIComponent(id)}`;
      postsEntries.push({
        url: `${base}${path}`,
        lastModified: ts,
        changeFrequency: hot ? 'hourly' : 'weekly',
        priority: isTip ? 0.87 : hot ? 0.88 : 0.84,
      });
    }

    for (const row of boardPostsRes.data ?? []) {
      const id = row.id as string;
      if (!id) continue;
      const ts = row.updated_at ? new Date(row.updated_at as string) : fallback;
      boardPostsEntries.push({
        url: `${base}/boards/${encodeURIComponent(id)}`,
        lastModified: ts,
        changeFrequency: 'weekly',
        priority: 0.84,
      });
    }

    const newsRows = newsRes.data ?? [];
    for (let i = 0; i < newsRows.length; i++) {
      const row = newsRows[i]!;
      const id = row.id as string;
      const ts = row.created_at ? new Date(row.created_at as string) : fallback;
      const hot = i < NEWS_HOT_CAP;
      newsEntries.push({
        url: `${base}/news/${encodeURIComponent(id)}`,
        lastModified: ts,
        changeFrequency: hot ? 'hourly' : 'daily',
        priority: hot ? 0.82 : 0.74,
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

    for (const row of localSpotsRes.data ?? []) {
      const slug =
        String((row as { slug?: string }).slug ?? '').trim() ||
        String((row as { minihome_public_slug?: string }).minihome_public_slug ?? '').trim();
      if (!slug) continue;
      const ts = row.updated_at ? new Date(row.updated_at as string) : fallback;
      localSpotEntries.push({
        url: `${base}/local/${encodeURIComponent(slug)}`,
        lastModified: ts,
        changeFrequency: 'weekly',
        priority: 0.74,
      });
    }
  } catch {
    // Supabase 미설정·일시 오류 시 정적 URL만
  }

  /** 동적 구간: 커뮤니티(posts) → 통합 게시판(board_posts) → 로컬 스팟 → 뉴스 → 미니홈 */
  return [
    ...staticEntries,
    ...postsEntries,
    ...boardPostsEntries,
    ...localSpotEntries,
    ...newsEntries,
    ...minihomeEntries,
  ];
}
