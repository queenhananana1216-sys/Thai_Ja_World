import 'server-only';

import { unstable_cache } from 'next/cache';

import { createServiceRoleClient } from '@/lib/supabase/admin';

import type { StatsResponse } from '@/lib/landing/types';

/**
 * 공개 랜딩·/api/stats 에서 쓰는 집계. 서비스 롤 필수 — 미설정 시 createServiceRoleClient 가 즉시 throw.
 * HTTP 로 자기 도메인을 때리지 않아 Vercel 빌드(SSG)에서도 동일 프로세스·동일 env 로 DB 에 직접 붙는다.
 */
export async function fetchPublicSiteStatsFromDb(): Promise<StatsResponse> {
  const admin = createServiceRoleClient();

  const [
    { count: memberCount },
    { count: postCount },
    { count: spotCount },
    { count: newsCount },
    { data: latestPostRow },
    { data: latestSpotRow },
    { data: latestNewsRow },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('posts').select('*', { count: 'exact', head: true }),
    admin.from('local_spots').select('*', { count: 'exact', head: true }).eq('is_published', true),
    admin.from('processed_news').select('*', { count: 'exact', head: true }).eq('published', true),
    admin.from('posts').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin
      .from('local_spots')
      .select('updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('processed_news')
      .select('created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lastUpdatedAt =
    [latestPostRow?.created_at, latestSpotRow?.updated_at, latestNewsRow?.created_at]
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .sort()
      .at(-1) ?? null;

  return {
    memberCount: memberCount ?? 0,
    postCount: postCount ?? 0,
    spotCount: spotCount ?? 0,
    newsCount: newsCount ?? 0,
    lastUpdatedAt,
  };
}

/** 랜딩 서버 컴포넌트용 — 짧은 주기로 캐시해 빌드·재검증 부하를 줄임 */
export const loadCachedPublicSiteStats = unstable_cache(fetchPublicSiteStatsFromDb, ['public-site-stats-v1'], {
  revalidate: 600,
});
