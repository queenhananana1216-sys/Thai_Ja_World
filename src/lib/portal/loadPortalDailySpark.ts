import 'server-only';

import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import {
  buildDeterministicPortalSpark,
  PORTAL_DAILY_SPARK_SETTING_KEY,
  seoulYmd,
  type PortalDailySparkPayload,
} from '@/lib/portal/portalDailySpark';

function createReadonlyAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function parsePayload(raw: unknown): PortalDailySparkPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const spark_date = typeof o.spark_date === 'string' ? o.spark_date.trim() : '';
  const fortune_line = typeof o.fortune_line === 'string' ? o.fortune_line.trim() : '';
  const fortune_detail = typeof o.fortune_detail === 'string' ? o.fortune_detail.trim() : '';
  const mission_title = typeof o.mission_title === 'string' ? o.mission_title.trim() : '';
  const mission_body = typeof o.mission_body === 'string' ? o.mission_body.trim() : '';
  const mission_cta_href =
    typeof o.mission_cta_href === 'string' && o.mission_cta_href.trim() ? o.mission_cta_href.trim() : '/community/boards';
  const source =
    o.source === 'openai' || o.source === 'gemini' || o.source === 'deterministic' ? o.source : 'deterministic';
  if (!spark_date || !fortune_line || !fortune_detail || !mission_title || !mission_body) return null;
  return {
    spark_date,
    fortune_line,
    fortune_detail,
    mission_title,
    mission_body,
    mission_cta_href,
    source,
  };
}

async function loadPortalDailySparkImpl(): Promise<PortalDailySparkPayload> {
  const sb = createReadonlyAnon();
  if (!sb) return buildDeterministicPortalSpark();
  try {
    const { data, error } = await sb
      .from('site_settings')
      .select('value')
      .eq('key', PORTAL_DAILY_SPARK_SETTING_KEY)
      .maybeSingle();
    if (error || data?.value == null) return buildDeterministicPortalSpark();
    let rawVal: unknown = data.value;
    if (typeof rawVal === 'string') {
      try {
        rawVal = JSON.parse(rawVal) as unknown;
      } catch {
        return buildDeterministicPortalSpark();
      }
    }
    const parsed = parsePayload(rawVal);
    if (!parsed) return buildDeterministicPortalSpark();
    if (parsed.spark_date !== seoulYmd(new Date())) {
      return buildDeterministicPortalSpark();
    }
    return parsed;
  } catch {
    return buildDeterministicPortalSpark();
  }
}

export const PORTAL_DAILY_SPARK_CACHE_TAG = 'portal-daily-spark' as const;

const cached = unstable_cache(loadPortalDailySparkImpl, ['portal-daily-spark-v1'], {
  revalidate: 120,
  tags: [PORTAL_DAILY_SPARK_CACHE_TAG],
});

export async function loadPortalDailySpark(): Promise<PortalDailySparkPayload> {
  return cached();
}
