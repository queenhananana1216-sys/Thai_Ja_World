/**
 * GET /api/health/omni-radar
 * - error(503): DB 생존 또는 날씨 API 실패
 * - degraded(200): 코어는 살았으나 운세·한인망·콘텐츠(LLM) 파이프라인 중 하나 이상 이상
 * - healthy(200): 코어 + 확장 vitality 전부 통과
 */
import { NextResponse } from 'next/server';
import {
  checkBoardPostsReadProbe,
  checkChaosHttpImmuneTraining,
  checkChaosMonkeyRadar,
  checkShadowQaRadar,
  checkUiIncidentRadar,
} from '@/lib/health/omniRadarBoard';
import {
  checkContentPipelineStress,
  checkFortuneVitality,
  checkKoreanLivingGridNonempty,
  extendedVitalityAllOk,
} from '@/lib/health/serviceVitalityProbes';
import { checkPostsSchemaLayerRadar } from '@/lib/health/schemaLayerRadar';
import { recordPipelineErrorEvent } from '@/lib/pipeline/pipelineErrorLearning';
import {
  fetchThailandCitiesWeather,
  isThailandWeatherSnapshotComplete,
} from '@/lib/weather/fetchThailandCitiesWeather';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { checkSeoIndexingRadar } from '@/lib/seo/seoIndexingRadar';
import { checkPublicHtmlShellRadar } from '@/lib/health/pageShellRenderRadar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CRON_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const WEATHER_PROBE_RETRIES = 5;
const WEATHER_PROBE_BACKOFF_MS = 400;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

type CheckDb = { ok: boolean; ping_ms?: number; error?: string };
type CheckCron = {
  ok: boolean;
  last_verified_at?: string | null;
  age_ms?: number;
  age_hours?: number;
  error?: string;
};
type CheckWeather = {
  ok: boolean;
  http_status?: number;
  error?: string;
  attempts?: number;
  cities_ok?: boolean;
};
type WeatherPipelineRadar = {
  recent_error_rows: number;
  last_scope?: string | null;
  last_reason?: string | null;
  scanned: boolean;
};
type CheckRuntime = { ok: boolean; heap_used_mb?: number; error?: string };
type LiveIntegrityRadar = {
  ok: boolean;
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  scanned: boolean;
  last_checked_at?: string | null;
  slow_api_count?: number;
  cookie_fail_count?: number;
  write_fail_count?: number;
  route_fail_count?: number;
  auto_heal_triggered?: boolean;
  auto_heal_note?: string | null;
  error?: string;
};

/** PostgREST RPC `omni_radar_live_ping` → SELECT 1; 없으면 `profiles` 1행 조회로 연결만 검증 (publish_logs 미사용). */
async function checkLiveSqlPing(): Promise<CheckDb> {
  const start = performance.now();
  const ping_ms = () => Math.round(performance.now() - start);
  try {
    const sb = createServiceRoleClient();
    const rpc = await sb.rpc('omni_radar_live_ping');
    if (!rpc.error && rpc.data !== null && rpc.data !== undefined) {
      return { ok: true, ping_ms: ping_ms() };
    }
    const code = rpc.error?.code;
    const msg = rpc.error?.message ?? '';
    const missingRpc =
      code === 'PGRST202' ||
      code === '42883' ||
      /function .*omni_radar_live_ping/i.test(msg) ||
      /does not exist/i.test(msg);
    if (rpc.error && !missingRpc) {
      return { ok: false, ping_ms: ping_ms(), error: msg };
    }

    const { error } = await sb.from('profiles').select('id').limit(1);
    if (error) return { ok: false, ping_ms: ping_ms(), error: error.message };
    return { ok: true, ping_ms: ping_ms() };
  } catch (e) {
    return { ok: false, ping_ms: ping_ms(), error: e instanceof Error ? e.message : String(e) };
  }
}

type BizAuditQueueRadar = {
  warn: boolean;
  pending_count: number;
  oldest_pending_hours: number | null;
  hint: string | null;
  skipped?: boolean;
  error?: string;
};

/** 한인 생활망 감사 큐(`biz_update_proposals`) — pending 이 쌓이면 오너에게만 옴니 툴팁 경고 */
async function checkBizAuditQueueRadar(): Promise<BizAuditQueueRadar> {
  if (!isServiceRoleConfigured()) {
    return {
      warn: false,
      pending_count: 0,
      oldest_pending_hours: null,
      hint: null,
      skipped: true,
      error: 'service_role_unconfigured',
    };
  }
  try {
    const sb = createServiceRoleClient();
    const { count, error: cErr } = await sb
      .from('biz_update_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (cErr) {
      return {
        warn: false,
        pending_count: 0,
        oldest_pending_hours: null,
        hint: null,
        skipped: false,
        error: cErr.message,
      };
    }
    const pendingCount = typeof count === 'number' ? count : 0;

    const { data: oldestRow, error: oErr } = await sb
      .from('biz_update_proposals')
      .select('created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    let oldestHours: number | null = null;
    if (!oErr && oldestRow?.created_at) {
      const t = new Date(oldestRow.created_at).getTime();
      if (Number.isFinite(t)) {
        oldestHours = (Date.now() - t) / (1000 * 60 * 60);
      }
    }

    const warn = pendingCount >= 5 || (oldestHours != null && oldestHours >= 72);
    const hint = warn
      ? `미처리 수정 제안 ${pendingCount}건 — /admin/biz-audit`
      : pendingCount > 0
        ? `수정 제안 대기 ${pendingCount}건(임계 미만)`
        : null;

    return {
      warn,
      pending_count: pendingCount,
      oldest_pending_hours: oldestHours != null ? Math.round(oldestHours * 10) / 10 : null,
      hint,
    };
  } catch (e) {
    return {
      warn: false,
      pending_count: 0,
      oldest_pending_hours: null,
      hint: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkCronRadar(): Promise<CheckCron> {
  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('korean_businesses')
      .select('last_verified_at')
      .order('last_verified_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };

    const ts = data?.last_verified_at ?? null;
    if (!ts) {
      return { ok: false, last_verified_at: null, error: 'no_last_verified_at (empty table or all null)' };
    }

    const verified = new Date(ts).getTime();
    if (!Number.isFinite(verified)) {
      return { ok: false, last_verified_at: ts, error: 'invalid_last_verified_at_timestamp' };
    }

    const age_ms = Date.now() - verified;
    const age_hours = age_ms / (1000 * 60 * 60);

    if (age_ms > CRON_MAX_AGE_MS) {
      return {
        ok: false,
        last_verified_at: ts,
        age_ms,
        age_hours: Math.round(age_hours * 100) / 100,
        error: `stale: last_verified_at older than 24h (${age_hours.toFixed(1)}h)`,
      };
    }

    return {
      ok: true,
      last_verified_at: ts,
      age_ms,
      age_hours: Math.round(age_hours * 100) / 100,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** `/api/weather` 와 동일 3도시 페이로드 — transient 오류 시 소량 재시도(셀프힐). */
async function checkWeatherPipeline(): Promise<CheckWeather> {
  let lastErr = 'weather_incomplete';
  for (let attempt = 0; attempt < WEATHER_PROBE_RETRIES; attempt++) {
    try {
      const { cities } = await fetchThailandCitiesWeather('ko', { cache: 'no-store' });
      if (isThailandWeatherSnapshotComplete(cities)) {
        return { ok: true, attempts: attempt + 1, cities_ok: true };
      }
      lastErr = 'weather_incomplete_or_partial';
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    if (attempt < WEATHER_PROBE_RETRIES - 1) {
      await sleep(WEATHER_PROBE_BACKOFF_MS * (attempt + 1));
    }
  }
  void recordPipelineErrorEvent({
    scope: 'weather.open_meteo_probe',
    reasonCode: 'PROBE_FAILED',
    messageExcerpt: lastErr,
    meta: { attempts: WEATHER_PROBE_RETRIES },
  });
  return { ok: false, error: lastErr, attempts: WEATHER_PROBE_RETRIES, cities_ok: false };
}

async function scanRecentWeatherPipelineErrors(): Promise<WeatherPipelineRadar> {
  if (!isServiceRoleConfigured()) {
    return { recent_error_rows: 0, scanned: false };
  }
  try {
    const sb = createServiceRoleClient();
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data, error } = await sb
      .from('pipeline_error_events')
      .select('scope, reason_code, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(48);
    if (error) {
      return { recent_error_rows: 0, scanned: true };
    }
    const weatherish = (data ?? []).filter((r) =>
      /weather|meteo|open[\s._-]*meteo/i.test(`${r.scope ?? ''} ${r.reason_code ?? ''}`),
    );
    return {
      recent_error_rows: weatherish.length,
      last_scope: weatherish[0]?.scope ?? null,
      last_reason: weatherish[0]?.reason_code ?? null,
      scanned: true,
    };
  } catch {
    return { recent_error_rows: 0, scanned: true };
  }
}

async function scanRecentLiveIntegrity(): Promise<LiveIntegrityRadar> {
  if (!isServiceRoleConfigured()) {
    return { ok: true, status: 'unknown', scanned: false, error: 'service_role_unconfigured' };
  }
  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('live_integrity_scan_events')
      .select(
        'status, created_at, slow_api_count, cookie_fail_count, write_fail_count, route_fail_count, auto_heal_triggered, auto_heal_note',
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, status: 'unknown', scanned: true, error: error.message };
    if (!data) return { ok: true, status: 'unknown', scanned: true, error: 'no_live_scan_row' };
    const status = String(data.status ?? 'unknown') as LiveIntegrityRadar['status'];
    return {
      ok: status === 'healthy',
      status,
      scanned: true,
      last_checked_at: data.created_at ?? null,
      slow_api_count: Number(data.slow_api_count ?? 0),
      cookie_fail_count: Number(data.cookie_fail_count ?? 0),
      write_fail_count: Number(data.write_fail_count ?? 0),
      route_fail_count: Number(data.route_fail_count ?? 0),
      auto_heal_triggered: Boolean(data.auto_heal_triggered),
      auto_heal_note: (data.auto_heal_note as string | null) ?? null,
    };
  } catch (e) {
    return { ok: false, status: 'unknown', scanned: true, error: e instanceof Error ? e.message : String(e) };
  }
}

function checkRuntimeResources(): CheckRuntime {
  try {
    const mu = process.memoryUsage();
    const heapMb = mu.heapUsed / (1024 * 1024);
    if (!Number.isFinite(heapMb)) {
      return { ok: false, error: 'memory_metrics_invalid' };
    }
    if (heapMb > 3_800) {
      return { ok: false, heap_used_mb: Math.round(heapMb * 10) / 10, error: 'heap_used_critical' };
    }
    return { ok: true, heap_used_mb: Math.round(heapMb * 10) / 10 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(): Promise<NextResponse> {
  const [
    database,
    weather,
    weather_pipeline_radar,
    seo_indexing,
    runtime,
    cron_radar,
    shadow_qa,
    chaos_base,
    immune_train,
    ui_surface,
    board_posts_read,
    schema_layer,
    fortune_vitality,
    korean_living_grid,
    content_pipeline,
    biz_audit_queue,
    live_integrity,
    page_shell_render,
  ] = await Promise.all([
    checkLiveSqlPing(),
    checkWeatherPipeline(),
    scanRecentWeatherPipelineErrors(),
    checkSeoIndexingRadar(),
    Promise.resolve(checkRuntimeResources()),
    checkCronRadar(),
    checkShadowQaRadar(),
    checkChaosMonkeyRadar(),
    checkChaosHttpImmuneTraining(),
    checkUiIncidentRadar(),
    checkBoardPostsReadProbe(),
    checkPostsSchemaLayerRadar(),
    checkFortuneVitality(),
    checkKoreanLivingGridNonempty(),
    checkContentPipelineStress(),
    checkBizAuditQueueRadar(),
    scanRecentLiveIntegrity(),
    checkPublicHtmlShellRadar(),
  ]);

  const chaos_monkey = {
    ...chaos_base,
    immune_training_active: immune_train.active,
    immune_training_since: immune_train.since,
  };

  const chaosOk = chaos_monkey.ok || chaos_monkey.skipped === true;
  const shadow_write_ok = shadow_qa.skipped === true || shadow_qa.ok;

  const core_ok = database.ok && weather.ok;
  const extended_ok = extendedVitalityAllOk(fortune_vitality, korean_living_grid, content_pipeline);
  const live_integrity_ok = live_integrity.status === 'healthy' || live_integrity.status === 'unknown';
  const page_shell_ok = page_shell_render.skipped === true || page_shell_render.ok === true;
  /** 자기 호스트 실측 — HTTP 200·DB 녹 표시등만으로 「살았다」고 보지 않음 */
  const page_shell_hard_fail =
    page_shell_render.skipped !== true && page_shell_render.ok !== true;

  let radar_status: 'healthy' | 'degraded' | 'error';
  if (!core_ok || live_integrity.status === 'error') {
    radar_status = 'error';
  } else if (page_shell_hard_fail) {
    radar_status = 'error';
  } else if (extended_ok && live_integrity_ok) {
    radar_status = 'healthy';
  } else {
    radar_status = 'degraded';
  }

  const healthy = radar_status === 'healthy';

  const shield_pulse = Boolean(core_ok && extended_ok && page_shell_ok && chaos_monkey.shield_pulse);

  const legacy_secondary_ok =
    database.ok &&
    weather.ok &&
    runtime.ok &&
    cron_radar.ok &&
    shadow_write_ok &&
    chaosOk &&
    ui_surface.ok &&
    board_posts_read.ok;

  const degradation_errors: string[] = [];
  if (radar_status === 'degraded') {
    if (!fortune_vitality.skipped && !fortune_vitality.ok) {
      degradation_errors.push(`fortune_vitality: ${fortune_vitality.error ?? 'fail'}`);
    }
    if (!korean_living_grid.skipped && !korean_living_grid.ok) {
      degradation_errors.push(`korean_living_grid: ${korean_living_grid.error ?? 'fail'}`);
    }
    if (!content_pipeline.skipped && !content_pipeline.ok) {
      degradation_errors.push(`content_pipeline: ${content_pipeline.error ?? 'fail'}`);
    }
    if (live_integrity.status !== 'healthy' && live_integrity.status !== 'unknown') {
      degradation_errors.push(
        `live_integrity: slow=${live_integrity.slow_api_count ?? 0}, cookie=${live_integrity.cookie_fail_count ?? 0}, write=${live_integrity.write_fail_count ?? 0}, route=${live_integrity.route_fail_count ?? 0}`,
      );
    }
  }

  const motherbrain_health_basis = (radar_status !== 'error'
    ? extended_ok && live_integrity_ok
      ? ('database_weather_pages_ok' as const)
      : !extended_ok
        ? ('core_ok_extended_degraded' as const)
        : ('live_integrity_degraded' as const)
    : !database.ok || !weather.ok
      ? ('database_or_weather_down' as const)
      : live_integrity.status === 'error'
        ? ('live_integrity_fatal' as const)
        : ('page_shell_render_failed' as const)) as
    | 'database_or_weather_down'
    | 'live_integrity_fatal'
    | 'page_shell_render_failed'
    | 'database_weather_pages_ok'
    | 'core_ok_extended_degraded'
    | 'live_integrity_degraded'
    /** @deprecated 과거 문자열 호환 — 클라 대시보드가 아직 참조하면 유지 */
    | 'database_weather_fortune_korean_news';

  const checks = {
    database,
    weather,
    weather_pipeline_radar,
    seo_indexing,
    runtime,
    cron_radar,
    shadow_qa,
    chaos_monkey,
    ui_surface,
    board_posts_read,
    schema_layer,
    fortune_vitality,
    korean_living_grid,
    content_pipeline,
    biz_audit_queue,
    live_integrity,
    page_shell_render,
    motherbrain: {
      shield_pulse,
      all_green: healthy,
      radar_status,
      core_ok,
      extended_ok,
      live_integrity_ok,
      page_shell_ok,
      health_basis:
        motherbrain_health_basis === 'database_weather_pages_ok'
          ? 'database_weather_fortune_korean_news'
          : motherbrain_health_basis,
      defense_success_rate: chaos_monkey.defense_success_rate ?? null,
      chaos_skipped: chaos_monkey.skipped === true,
      shadow_write_ok,
      seo_indexing_ok: seo_indexing.seo_indexing_ok,
      seo_indexing_skipped: seo_indexing.skipped === true,
      /** 과거 설계: 전 구간 합격 여부(모니터링용, healthy 와 무관) */
      legacy_secondary_ok,
    },
  };

  if (radar_status === 'healthy') {
    return NextResponse.json(
      {
        status: 'healthy',
        all_systems_go: true,
        checks,
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  if (radar_status === 'degraded') {
    return NextResponse.json(
      {
        status: 'degraded',
        all_systems_go: false,
        checks,
        degradation_errors,
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  const errors: string[] = [];
  if (!database.ok) errors.push(`database: ${database.error ?? 'unknown'}`);
  if (!weather.ok) errors.push(`weather: ${weather.error ?? 'unknown'}`);
  if (live_integrity.status === 'error') {
    errors.push(
      `live_integrity: slow=${live_integrity.slow_api_count ?? 0}, cookie=${live_integrity.cookie_fail_count ?? 0}, write=${live_integrity.write_fail_count ?? 0}, route=${live_integrity.route_fail_count ?? 0}, heal=${live_integrity.auto_heal_note ?? 'n/a'}`,
    );
  }
  if (!page_shell_ok && page_shell_render.skipped !== true) {
    errors.push(`page_shell_render: ${page_shell_render.error ?? 'probe_failed'}`);
  }

  return NextResponse.json(
    {
      status: 'error',
      all_systems_go: false,
      checks,
      errors,
    },
    { status: 503, headers: NO_STORE_HEADERS },
  );
}
