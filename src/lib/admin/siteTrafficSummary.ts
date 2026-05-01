import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';

export type SiteTrafficSummary24h = {
  views: number;
  clicks: number;
  avgDwellSeconds: number;
  sampleDwells: number;
  error: string | null;
};

/** 최근 24시간 `site_analytics` 집계 — 테이블 없으면 0·에러문구 */
export async function fetchSiteTrafficSummary24h(): Promise<SiteTrafficSummary24h> {
  try {
    const admin = createServiceRoleClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await admin
      .from('site_analytics')
      .select('kind, dwell_ms')
      .gte('recorded_at', since)
      .limit(10000);

    if (error) {
      return {
        views: 0,
        clicks: 0,
        avgDwellSeconds: 0,
        sampleDwells: 0,
        error: error.message,
      };
    }

    const list = (rows ?? []) as { kind: string; dwell_ms: number | null }[];
    let views = 0;
    let clicks = 0;
    let dwellSum = 0;
    let dwellN = 0;
    for (const r of list) {
      if (r.kind === 'view') views += 1;
      if (r.kind === 'click') clicks += 1;
      if (r.kind === 'dwell' && typeof r.dwell_ms === 'number' && r.dwell_ms > 0) {
        dwellSum += r.dwell_ms;
        dwellN += 1;
      }
    }

    const avgMs = dwellN > 0 ? dwellSum / dwellN : 0;
    return {
      views,
      clicks,
      avgDwellSeconds: Math.round((avgMs / 1000) * 10) / 10,
      sampleDwells: dwellN,
      error: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      views: 0,
      clicks: 0,
      avgDwellSeconds: 0,
      sampleDwells: 0,
      error: msg,
    };
  }
}
