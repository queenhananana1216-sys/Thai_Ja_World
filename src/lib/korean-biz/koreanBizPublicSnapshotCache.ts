import 'server-only';

import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import {
  fetchKoreanBusinessesForPublicPageResilient,
  fetchKoreanBusinessesViaServiceRole,
} from '@/lib/korean-biz/fetchKoreanBusinesses';
import type { KoreanBizRow } from '@/lib/korean-biz/koreanBizTypes';
import { ensureKoreanBizMinimumRows } from '@/lib/korean-biz/ensureKoreanBizMinimumRows';

export const KOREAN_BIZ_PUBLIC_CACHE_TAG = 'korean-biz-public-snapshot' as const;

/**
 * anon·셀프힐·서비스롤 순으로 채워진 스냅샷을 Data Cache 에 보관(≈90s).
 * 실시간 쿼리가 지연되어도 UI 가 빈 화면 대신 목록 유지 가능.
 */
async function buildFreshSnapshotRows(): Promise<KoreanBizRow[]> {
  const sb = createServerClient();
  let { rows } = await fetchKoreanBusinessesForPublicPageResilient(sb, { retries: 4 });
  const needHeal = rows.length === 0 || rows.length < 10;
  if (needHeal) {
    await ensureKoreanBizMinimumRows();
    ({ rows } = await fetchKoreanBusinessesForPublicPageResilient(sb, { retries: 4 }));
  }
  if (rows.length > 0) return rows;
  const svc = await fetchKoreanBusinessesViaServiceRole();
  return svc.rows;
}

const cachedSnapshotGetter = unstable_cache(buildFreshSnapshotRows, ['korean-biz-public-snapshot-v4'], {
  revalidate: 90,
  tags: [KOREAN_BIZ_PUBLIC_CACHE_TAG],
});

export async function getKoreanBizStaleSnapshotCached(): Promise<KoreanBizRow[]> {
  try {
    return await cachedSnapshotGetter();
  } catch {
    return [];
  }
}
