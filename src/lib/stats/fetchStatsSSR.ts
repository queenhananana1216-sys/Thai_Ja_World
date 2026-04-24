/**
 * 서버 컴포넌트에서 자기 자신을 `fetch('/api/stats')` 하지 않도록, 동일 로직을
 * 함수로 묶어 **직접 호출** 하는 헬퍼. `app/landing/page.tsx` 가 사용한다.
 *
 * - 실패해도 절대 throw 하지 않는다 (루트 레이아웃 하드닝과 같은 원칙).
 * - Supabase env 누락 시에도 `LANDING_DEFAULT_STATS` 로 복귀.
 */
import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { LANDING_DEFAULT_STATS } from '@/lib/landing/constants';
import type { StatsResponse } from '@/lib/landing/types';

export async function fetchLandingStatsSSR(): Promise<StatsResponse & { degraded: boolean }> {
  try {
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
      admin
        .from('local_spots')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true),
      admin
        .from('processed_news')
        .select('*', { count: 'exact', head: true })
        .eq('published', true),
      admin
        .from('posts')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
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
      degraded: false,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[fetchLandingStatsSSR] degraded fallback:', err);
    } else {
      console.warn(
        '[fetchLandingStatsSSR] degraded fallback:',
        err instanceof Error ? err.message : String(err),
      );
    }
    return { ...LANDING_DEFAULT_STATS, degraded: true };
  }
}
