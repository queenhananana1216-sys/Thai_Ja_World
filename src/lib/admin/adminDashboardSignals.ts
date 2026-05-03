import 'server-only';

import { getSiteBaseUrl } from '@/lib/seo/site';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export type SiteReachability = {
  ok: boolean;
  latencyMs: number;
  httpStatus: number | null;
  checkedUrl: string;
};

export async function probeSiteReachability(): Promise<SiteReachability> {
  const checkedUrl = getSiteBaseUrl();
  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(checkedUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'LivingInThai-AdminHealthProbe/1', Accept: 'text/html,application/json' },
    });
    clearTimeout(tid);
    return {
      ok: res.ok,
      latencyMs: Date.now() - started,
      httpStatus: res.status,
      checkedUrl,
    };
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      httpStatus: null,
      checkedUrl,
    };
  }
}

export type PipelineLastRun = {
  iso: string | null;
  label: string;
};

/** bot_actions 최근 1건 시간 — 파이프라인 활동 대리 지표 */
export async function fetchLatestPipelineTouch(): Promise<PipelineLastRun> {
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('bot_actions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data || typeof (data as { created_at?: unknown }).created_at !== 'string') {
      return { iso: null, label: '기록 없음' };
    }
    const iso = (data as { created_at: string }).created_at;
    const d = new Date(iso);
    return {
      iso,
      label: Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }),
    };
  } catch {
    return { iso: null, label: '조회 실패' };
  }
}
