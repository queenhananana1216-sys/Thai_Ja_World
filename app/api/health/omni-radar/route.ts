/**
 * GET /api/health/omni-radar — DB · Biz Radar 크론 · 날씨 · 쉐도우 QA · UI 인시던트 통합 생존 검증
 */
import { NextResponse } from 'next/server';
import {
  checkChaosMonkeyRadar,
  checkShadowQaRadar,
  checkUiIncidentRadar,
} from '@/lib/health/omniRadarBoard';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 홈·크론과 동일한 Open-Meteo 방콕 단일 지점 (키 불필요) */
const OPEN_METEO_BANGKOK =
  'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,weather_code&timezone=Asia%2FBangkok';

const CRON_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

type CheckDb = { ok: boolean; ping_ms?: number; error?: string };
type CheckCron = {
  ok: boolean;
  last_verified_at?: string | null;
  age_ms?: number;
  age_hours?: number;
  error?: string;
};
type CheckWeather = { ok: boolean; http_status?: number; error?: string };

async function checkDatabase(): Promise<CheckDb> {
  const start = performance.now();
  try {
    const sb = createServiceRoleClient();
    const { error } = await sb.from('site_settings').select('key').limit(1);
    const ping_ms = Math.round(performance.now() - start);
    if (error) return { ok: false, ping_ms, error: error.message };
    return { ok: true, ping_ms };
  } catch (e) {
    const ping_ms = Math.round(performance.now() - start);
    return { ok: false, ping_ms, error: e instanceof Error ? e.message : String(e) };
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
      headers: { 'User-Agent': 'TaejaOmniRadar/1' },
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

export async function GET(): Promise<NextResponse> {
  const [database, cron_radar, weather, shadow_qa, chaos_monkey, ui_surface] = await Promise.all([
    checkDatabase(),
    checkCronRadar(),
    checkWeatherPipeline(),
    checkShadowQaRadar(),
    checkChaosMonkeyRadar(),
    checkUiIncidentRadar(),
  ]);

  const chaosOk = chaos_monkey.ok || chaos_monkey.skipped === true;
  const motherbrainDefenseHealthy =
    database.ok &&
    cron_radar.ok &&
    weather.ok &&
    shadow_qa.ok &&
    chaosOk &&
    ui_surface.ok;

  const checks = {
    database,
    cron_radar,
    weather,
    shadow_qa,
    chaos_monkey,
    ui_surface,
    motherbrain: {
      shield_pulse: motherbrainDefenseHealthy,
      all_green: motherbrainDefenseHealthy,
      defense_success_rate: chaos_monkey.defense_success_rate ?? null,
      chaos_skipped: chaos_monkey.skipped === true,
    },
  };

  const allOk = motherbrainDefenseHealthy;

  if (allOk) {
    return NextResponse.json({
      status: 'healthy',
      all_systems_go: true,
      checks,
    });
  }

  const errors: string[] = [];
  if (!database.ok) errors.push(`database: ${database.error ?? 'unknown'}`);
  if (!cron_radar.ok) errors.push(`cron_radar: ${cron_radar.error ?? 'unknown'}`);
  if (!weather.ok) errors.push(`weather: ${weather.error ?? 'unknown'}`);
  if (!shadow_qa.ok) errors.push(`shadow_qa: ${shadow_qa.error ?? 'unknown'}`);
  if (!chaosOk) errors.push(`chaos_monkey: ${chaos_monkey.error ?? 'unknown'}`);
  if (!ui_surface.ok) errors.push(`ui_surface: ${ui_surface.error ?? 'unknown'}`);

  return NextResponse.json(
    {
      status: 'error',
      all_systems_go: false,
      checks,
      errors,
    },
    { status: 503 },
  );
}
