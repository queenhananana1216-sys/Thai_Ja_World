import { type NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { recordPipelineErrorEvent } from '@/lib/pipeline/pipelineErrorLearning';
import { notifyOwnerOmniCritical } from '@/lib/ops/ownerOmniHotline';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type PageProbe = {
  path: string;
  ok: boolean;
  status: number | null;
  latency_ms: number;
  error?: string;
};

type NewsFreshnessProbe = {
  newest_ko_created_at: string | null;
  stale_hours: number;
  stale_threshold_hours: number;
  stale_detected: boolean;
};

const PAGE_TARGETS = [
  '/',
  '/news',
  '/tips',
  '/korean-biz',
  '/community/boards',
  '/boards',
  '/local',
  '/shop',
  '/minihome',
  '/auth/login',
] as const;
/** 길목 혼잡 감지 민감도 상향 — 과부하 신호 시 곧바로 degraded·힐 루트 */
const SLOW_API_MS = 2600;

function siteBase(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://127.0.0.1:3000';
  return raw.replace(/\/+$/, '');
}

async function timedFetch(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number | null; latencyMs: number; setCookie: string[]; error?: string }> {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, { ...init, cache: 'no-store', signal: ctrl.signal });
    clearTimeout(t);
    const rawSetCookie = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    const fallback = res.headers.get('set-cookie');
    return {
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - start,
      setCookie: rawSetCookie.length > 0 ? rawSetCookie : fallback ? [fallback] : [],
    };
  } catch (e) {
    clearTimeout(t);
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - start,
      setCookie: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function runWriteProbe(): Promise<{ ok: boolean; error?: string }> {
  if (!isServiceRoleConfigured()) {
    return { ok: false, error: 'service_role_unconfigured' };
  }
  try {
    const sb = createServiceRoleClient();
    const ins = await sb
      .from('system_write_probes')
      .insert({
        probe_kind: 'board_write_simulation',
        ok: true,
        detail: {
          source: 'live_integrity_scan',
          note: 'safe synthetic write probe',
        },
      })
      .select('id')
      .single();
    if (ins.error || !ins.data?.id) {
      return { ok: false, error: ins.error?.message ?? 'insert_failed' };
    }
    const del = await sb.from('system_write_probes').delete().eq('id', ins.data.id);
    if (del.error) {
      return { ok: false, error: del.error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function triggerSelfHeal(reason: string, details: Record<string, unknown>): Promise<{ triggered: boolean; note: string }> {
  const secret = process.env.CRON_SECRET?.trim() || process.env.BOT_CRON_SECRET?.trim();
  if (!secret) {
    return { triggered: false, note: 'cron_secret_missing' };
  }
  try {
    const base = siteBase();
    const res = await fetch(`${base}/api/health/motherbrain-heal`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        deep: true,
        pathname: '/',
        pipeline_error_retention_hours: 72,
        reason,
        details,
      }),
      cache: 'no-store',
    });
    return { triggered: res.ok, note: `motherbrain_heal_http_${res.status}` };
  } catch (e) {
    return { triggered: false, note: e instanceof Error ? e.message : String(e) };
  }
}

async function triggerNewsRelief(reason: string): Promise<{ triggered: boolean; note: string }> {
  const secret = process.env.CRON_SECRET?.trim() || process.env.BOT_CRON_SECRET?.trim();
  if (!secret) return { triggered: false, note: 'cron_secret_missing' };
  try {
    const base = siteBase();
    const res = await fetch(`${base}/api/cron/news-stagnation-relief?staleHours=24&targetPublished=129`, {
      headers: {
        authorization: `Bearer ${secret}`,
      },
      cache: 'no-store',
    });
    return { triggered: res.ok, note: `${reason}:news_stagnation_relief_http_${res.status}` };
  } catch (e) {
    return { triggered: false, note: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const base = siteBase();
  const pageResults: PageProbe[] = [];
  let slowApiCount = 0;
  let routeFailCount = 0;

  for (const path of PAGE_TARGETS) {
    const probe = await timedFetch(`${base}${path}`, {
      headers: {
        'user-agent': 'TJW-LiveIntegrityScanner/1.0',
        cookie: 'tjw_probe_session=1',
      },
    });
    if (probe.latencyMs > SLOW_API_MS) slowApiCount += 1;
    if (!probe.ok) routeFailCount += 1;
    pageResults.push({
      path,
      ok: probe.ok,
      status: probe.status,
      latency_ms: probe.latencyMs,
      error: probe.error,
    });
  }

  const authProbe = await timedFetch(`${base}/auth/login`, {
    headers: {
      'user-agent': 'TJW-LiveIntegrityScanner/1.0',
      cookie: 'sb-access-token=fake; sb-refresh-token=fake',
    },
  });
  const hasForcedCookieReset = authProbe.setCookie.some((v) => /max-age=0/i.test(v) || /expires=/i.test(v) && /1970/i.test(v));
  const cookieFailCount = hasForcedCookieReset ? 1 : 0;

  const writeProbe = await runWriteProbe();
  const writeFailCount = writeProbe.ok ? 0 : 1;

  const status: 'healthy' | 'degraded' | 'error' =
    routeFailCount > 0 ? 'error' : slowApiCount > 0 || cookieFailCount > 0 || writeFailCount > 0 ? 'degraded' : 'healthy';

  let autoHealTriggered = false;
  let autoHealNote: string | null = null;
  let newsReliefTriggered = false;
  let newsReliefNote: string | null = null;
  let newsFreshness: NewsFreshnessProbe = {
    newest_ko_created_at: null,
    stale_hours: 999,
    stale_threshold_hours: 24,
    stale_detected: false,
  };

  if (isServiceRoleConfigured()) {
    try {
      const sb = createServiceRoleClient();
      const { data: newestKo } = await sb
        .from('processed_news')
        .select('created_at')
        .eq('published', true)
        .eq('language', 'ko')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const newestIso = newestKo?.created_at ? String(newestKo.created_at) : null;
      const newestTs = newestIso ? new Date(newestIso).getTime() : Number.NaN;
      const staleHours = Number.isFinite(newestTs) ? (Date.now() - newestTs) / 3_600_000 : 999;
      const staleDetected = !Number.isFinite(newestTs) || staleHours >= 24;
      newsFreshness = {
        newest_ko_created_at: newestIso,
        stale_hours: Math.round(staleHours * 10) / 10,
        stale_threshold_hours: 24,
        stale_detected: staleDetected,
      };
      if (staleDetected) {
        const relief = await triggerNewsRelief('live_integrity_scan_news_stale');
        newsReliefTriggered = relief.triggered;
        newsReliefNote = relief.note;
      }
    } catch (e) {
      newsReliefNote = e instanceof Error ? e.message : String(e);
    }
  }
  if (status !== 'healthy') {
    const heal = await triggerSelfHeal('live_integrity_scan_detected_issue', {
      slowApiCount,
      cookieFailCount,
      writeFailCount,
      routeFailCount,
    });
    autoHealTriggered = heal.triggered;
    autoHealNote = heal.note;
  }

  if (status !== 'healthy') {
    await recordPipelineErrorEvent({
      scope: 'health.live_integrity_scan',
      reasonCode: status === 'error' ? 'E2E_ROUTE_FAILURE' : 'E2E_DEGRADED',
      messageExcerpt: `slow=${slowApiCount},cookie=${cookieFailCount},write=${writeFailCount},route=${routeFailCount}`,
      meta: {
        auto_heal_triggered: autoHealTriggered,
        auto_heal_note: autoHealNote ?? '',
        news_relief_triggered: newsReliefTriggered,
        news_relief_note: newsReliefNote ?? null,
        news_freshness: JSON.stringify(newsFreshness),
      },
    });

    const notifyWorthy =
      status === 'error' ||
      routeFailCount > 0 ||
      writeFailCount > 0 ||
      cookieFailCount > 0 ||
      slowApiCount >= 3;
    if (notifyWorthy) {
      const failing = pageResults.filter((p) => !p.ok || p.latency_ms > SLOW_API_MS);
      const detailLines = failing
        .slice(0, 12)
        .map((p) => `${p.path} status=${String(p.status)} ${p.latency_ms}ms ${p.error ?? ''}`.trim())
        .join(' | ');
      const fpBase = `e2e:${status}:${failing.map((p) => `${p.path}:${p.status ?? 'x'}`).join(';')}`;
      const fingerprint = fpBase.length > 240 ? fpBase.slice(0, 240) : fpBase;
      try {
        await notifyOwnerOmniCritical({
          kind: 'e2e_integrity',
          fingerprint,
          detail:
            `길목 스캔: ${status}. slow_api=${slowApiCount} route_fail=${routeFailCount} write_fail=${writeFailCount} cookie_fail=${cookieFailCount}. ` +
            `heal=${autoHealTriggered} ${autoHealNote ?? ''}. ` +
            `news_stale=${newsFreshness.stale_detected}(${newsFreshness.stale_hours}h), relief=${newsReliefTriggered} ${newsReliefNote ?? ''}. ` +
            `샘플: ${detailLines.slice(0, 900)}`,
        });
      } catch (e) {
        console.warn('[live-integrity-scan] owner notify failed:', e);
      }
    }
  }

  if (isServiceRoleConfigured()) {
    try {
      const sb = createServiceRoleClient();
      await sb.from('live_integrity_scan_events').insert({
        scan_scope: 'site_e2e_hourly',
        status,
        slow_api_count: slowApiCount,
        cookie_fail_count: cookieFailCount,
        write_fail_count: writeFailCount,
        route_fail_count: routeFailCount,
        auto_heal_triggered: autoHealTriggered,
        auto_heal_note: autoHealNote,
        news_relief_triggered: newsReliefTriggered,
        news_relief_note: newsReliefNote,
        details: {
          pages: pageResults,
          news_freshness: newsFreshness,
          auth_probe: {
            status: authProbe.status,
            latency_ms: authProbe.latencyMs,
            forced_cookie_reset: hasForcedCookieReset,
          },
          write_probe_ok: writeProbe.ok,
          write_probe_error: writeProbe.error ?? null,
        },
      });
    } catch {
      // DB 로깅 실패는 스캐너 응답 자체를 막지 않음
    }
  }

  const body = {
    ok: true,
    status,
    threshold_ms: SLOW_API_MS,
    metrics: {
      slow_api_count: slowApiCount,
      cookie_fail_count: cookieFailCount,
      write_fail_count: writeFailCount,
      route_fail_count: routeFailCount,
      auto_heal_triggered: autoHealTriggered,
      auto_heal_note: autoHealNote,
      news_relief_triggered: newsReliefTriggered,
      news_relief_note: newsReliefNote,
      news_freshness: newsFreshness,
    },
    pages: pageResults,
  };

  return NextResponse.json(body, { status: status === 'error' ? 503 : 200 });
}
