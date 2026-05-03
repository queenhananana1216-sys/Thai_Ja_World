/**
 * GET /api/health/omni-radar — 초록불은 오직 ① Supabase 생존 ② 외부 날씨 API.
 * publish_logs·ui_incident·Shadow QA·Chaos 등 과거 봇 기록은 checks 에만 남기고 판정(healthy)에는 불참.
 */
import { NextResponse } from 'next/server';
import {
  checkBoardPostsReadProbe,
  checkChaosHttpImmuneTraining,
  checkChaosMonkeyRadar,
  checkShadowQaRadar,
  checkUiIncidentRadar,
} from '@/lib/health/omniRadarBoard';
import { checkPostsSchemaLayerRadar } from '@/lib/health/schemaLayerRadar';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** 홈·크론과 동일한 Open-Meteo 방콕 단일 지점 (키 불필요) */
const OPEN_METEO_BANGKOK =
  'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,weather_code&timezone=Asia%2FBangkok';

const CRON_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

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
type CheckWeather = { ok: boolean; http_status?: number; error?: string };
type CheckRuntime = { ok: boolean; heap_used_mb?: number; error?: string };

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

async function checkWeatherPipeline(): Promise<CheckWeather> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(OPEN_METEO_BANGKOK, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'LivingInThai-OmniRadar/1' },
    });
    clearTimeout(t);

    if (!res.ok) {
      return { ok: false, http_status: res.status, error: `open_meteo_http_${res.status}` };
    }
    return { ok: true, http_status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
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
    runtime,
    cron_radar,
    shadow_qa,
    chaos_base,
    immune_train,
    ui_surface,
    board_posts_read,
    schema_layer,
  ] = await Promise.all([
    checkLiveSqlPing(),
    checkWeatherPipeline(),
    Promise.resolve(checkRuntimeResources()),
    checkCronRadar(),
    checkShadowQaRadar(),
    checkChaosMonkeyRadar(),
    checkChaosHttpImmuneTraining(),
    checkUiIncidentRadar(),
    checkBoardPostsReadProbe(),
    checkPostsSchemaLayerRadar(),
  ]);

  const chaos_monkey = {
    ...chaos_base,
    immune_training_active: immune_train.active,
    immune_training_since: immune_train.since,
  };

  const chaosOk = chaos_monkey.ok || chaos_monkey.skipped === true;
  const shadow_write_ok = shadow_qa.skipped === true || shadow_qa.ok;

  /** 레이더 본판(초록/빨강): DB 생존 + 날씨 API만. 나머지는 관측용. */
  const healthy = database.ok && weather.ok;

  const shield_pulse = Boolean(healthy && chaos_monkey.shield_pulse);

  const legacy_secondary_ok =
    database.ok &&
    weather.ok &&
    runtime.ok &&
    cron_radar.ok &&
    shadow_write_ok &&
    chaosOk &&
    ui_surface.ok &&
    board_posts_read.ok;

  const checks = {
    database,
    weather,
    runtime,
    cron_radar,
    shadow_qa,
    chaos_monkey,
    ui_surface,
    board_posts_read,
    schema_layer,
    motherbrain: {
      shield_pulse,
      all_green: healthy,
      health_basis: 'database_and_weather_only' as const,
      defense_success_rate: chaos_monkey.defense_success_rate ?? null,
      chaos_skipped: chaos_monkey.skipped === true,
      shadow_write_ok,
      /** 과거 설계: 전 구간 합격 여부(모니터링용, healthy 와 무관) */
      legacy_secondary_ok,
    },
  };

  if (healthy) {
    return NextResponse.json(
      {
        status: 'healthy',
        all_systems_go: true,
        checks,
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  const errors: string[] = [];
  if (!database.ok) errors.push(`database: ${database.error ?? 'unknown'}`);
  if (!weather.ok) errors.push(`weather: ${weather.error ?? 'unknown'}`);

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
