import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';

const SHADOW_QA_PIPELINE = 'cron/shadow-qa';
const SHADOW_SUCCESS_MAX_AGE_MS = 45 * 60 * 1000;
const UI_INCIDENT_WINDOW_MS = 30 * 60 * 1000;

const CHAOS_MONKEY_PIPELINE = 'cron/chaos-monkey';
/** 일일 크론 간격 고려 */
const CHAOS_SUCCESS_MAX_AGE_MS = 52 * 60 * 60 * 1000;
const CHAOS_STATS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const CHAOS_SHIELD_PULSE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export type ShadowQaRadar = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  last_event_at?: string | null;
};

export type UiIncidentRadar = {
  ok: boolean;
  error?: string;
  last_incident_at?: string | null;
};

/** 서비스 롤로 board_posts 행 1건 조회 — 테이블·RLS·그랜트 생존 확인 */
export type BoardPostsReadProbe = {
  ok: boolean;
  error?: string;
};

export async function checkBoardPostsReadProbe(): Promise<BoardPostsReadProbe> {
  const admin = createServiceRoleClient();
  const { error } = await admin.from('board_posts').select('id').limit(1);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type ChaosMonkeyRadar = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  /** 최근 샘플에서 성공 비율 (0–1), fallback·pause 스킵 제외 */
  defense_success_rate?: number;
  cycles_sample_size?: number;
  last_cycle_at?: string | null;
  last_self_heal_at?: string | null;
  /** 최근 자가 복구(셀프힐) 이벤트가 있으면 날씨 위젯 방패 펄스 */
  shield_pulse?: boolean;
};

export async function checkShadowQaRadar(): Promise<ShadowQaRadar> {
  const botConfigured = Boolean(process.env.SHADOW_QA_BOT_USER_ID?.trim());
  if (!botConfigured) {
    return { ok: true, skipped: true };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('publish_logs')
    .select('published_at, meta')
    .eq('channel', 'cron_pipeline')
    .eq('target_type', 'cron_pipeline')
    .eq('target_id', SHADOW_QA_PIPELINE)
    .order('published_at', { ascending: false })
    .limit(48);

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = data ?? [];
  const cycles = rows.filter((row) => {
    const m = row.meta as Record<string, unknown> | null;
    return m?.event === 'shadow_qa_cycle';
  });

  if (cycles.length === 0) {
    return { ok: false, error: 'shadow_qa_no_logs_yet' };
  }

  const latest = cycles[0]!;

  const meta = latest.meta as Record<string, unknown>;
  const status = meta?.status;
  const publishedAt = latest.published_at;

  if (status === 'failed') {
    return {
      ok: false,
      error: `shadow_qa_failed: ${String(meta?.reason ?? 'unknown')}`,
      last_event_at: publishedAt,
    };
  }

  if (status === 'success') {
    const age = Date.now() - Date.parse(publishedAt);
    if (!Number.isFinite(age)) {
      return { ok: false, error: 'shadow_qa_invalid_timestamp', last_event_at: publishedAt };
    }
    if (age > SHADOW_SUCCESS_MAX_AGE_MS) {
      return {
        ok: false,
        error: `shadow_qa_stale_success (${Math.round(age / 60000)}min)`,
        last_event_at: publishedAt,
      };
    }
    return { ok: true, last_event_at: publishedAt };
  }

  /** pause_skip 등 — 의도적 스킵은 LED 에서는 정상으로 본다 */
  if (status === 'fallback') {
    return { ok: true, last_event_at: publishedAt };
  }

  return {
    ok: false,
    error: `shadow_qa_unknown_status:${String(status)}`,
    last_event_at: publishedAt,
  };
}

function metaRecord(row: { meta?: unknown }): Record<string, unknown> | null {
  const m = row.meta;
  if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, unknown>;
  return null;
}

export async function checkChaosMonkeyRadar(): Promise<ChaosMonkeyRadar> {
  if (process.env.CHAOS_MONKEY_DISABLED === '1') {
    return { ok: true, skipped: true, shield_pulse: false };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('publish_logs')
    .select('published_at, meta')
    .eq('channel', 'cron_pipeline')
    .eq('target_type', 'cron_pipeline')
    .eq('target_id', CHAOS_MONKEY_PIPELINE)
    .order('published_at', { ascending: false })
    .limit(120);

  if (error) {
    return { ok: false, error: error.message, shield_pulse: false };
  }

  const rows = data ?? [];
  const now = Date.now();

  let lastSelfHealAt: string | null = null;
  for (const row of rows) {
    const m = metaRecord(row);
    if (m?.event === 'chaos_monkey_self_heal' && m?.status === 'success') {
      lastSelfHealAt = row.published_at;
      break;
    }
  }

  const shield_pulse =
    lastSelfHealAt != null &&
    Number.isFinite(Date.parse(lastSelfHealAt)) &&
    now - Date.parse(lastSelfHealAt) <= CHAOS_SHIELD_PULSE_MAX_AGE_MS;

  const terminalCycles = rows.filter((row) => {
    const m = metaRecord(row);
    if (m?.event !== 'chaos_monkey_cycle') return false;
    const st = m.status;
    return st === 'success' || st === 'failed';
  });

  const windowCut = now - CHAOS_STATS_WINDOW_MS;
  const cyclesInWindow = terminalCycles.filter((row) => Date.parse(row.published_at) >= windowCut);

  const successes = cyclesInWindow.filter((row) => metaRecord(row)?.status === 'success').length;
  const failures = cyclesInWindow.filter((row) => metaRecord(row)?.status === 'failed').length;
  const denom = successes + failures;
  const defense_success_rate = denom > 0 ? Math.round((successes / denom) * 1000) / 1000 : undefined;

  const latestAny = rows[0];
  const latestMeta = latestAny ? metaRecord(latestAny) : null;
  if (
    latestMeta?.event === 'chaos_monkey_cycle' &&
    latestMeta?.status === 'fallback' &&
    String(latestMeta.mode ?? '') === 'pause_skip'
  ) {
    return {
      ok: true,
      defense_success_rate,
      cycles_sample_size: denom,
      last_cycle_at: terminalCycles[0]?.published_at ?? null,
      last_self_heal_at: lastSelfHealAt,
      shield_pulse,
    };
  }

  if (terminalCycles.length === 0) {
    return {
      ok: false,
      error: 'chaos_no_training_logs',
      defense_success_rate,
      cycles_sample_size: 0,
      last_cycle_at: null,
      last_self_heal_at: lastSelfHealAt,
      shield_pulse,
    };
  }

  const latestTerminal = terminalCycles[0]!;
  const last_cycle_at = latestTerminal.published_at;
  const st = metaRecord(latestTerminal)?.status;

  if (st === 'failed') {
    const failAt = Date.parse(last_cycle_at);
    const mitigated =
      Number.isFinite(failAt) &&
      rows.some((row) => {
        const m = metaRecord(row);
        return (
          m?.event === 'chaos_monkey_self_heal' &&
          m?.status === 'success' &&
          Date.parse(row.published_at) > failAt
        );
      });

    if (mitigated) {
      const age = now - failAt;
      if (age <= CHAOS_SUCCESS_MAX_AGE_MS) {
        return {
          ok: true,
          defense_success_rate,
          cycles_sample_size: denom,
          last_cycle_at,
          last_self_heal_at: lastSelfHealAt,
          shield_pulse,
        };
      }
    }

    return {
      ok: false,
      error: 'chaos_last_cycle_failed',
      defense_success_rate,
      cycles_sample_size: denom,
      last_cycle_at,
      last_self_heal_at: lastSelfHealAt,
      shield_pulse,
    };
  }

  const age = now - Date.parse(last_cycle_at);
  if (!Number.isFinite(age)) {
    return {
      ok: false,
      error: 'chaos_invalid_timestamp',
      defense_success_rate,
      cycles_sample_size: denom,
      last_cycle_at,
      last_self_heal_at: lastSelfHealAt,
      shield_pulse,
    };
  }

  if (age > CHAOS_SUCCESS_MAX_AGE_MS) {
    return {
      ok: false,
      error: `chaos_stale_success (${Math.round(age / 3600000)}h)`,
      defense_success_rate,
      cycles_sample_size: denom,
      last_cycle_at,
      last_self_heal_at: lastSelfHealAt,
      shield_pulse,
    };
  }

  return {
    ok: true,
    defense_success_rate,
    cycles_sample_size: denom,
    last_cycle_at,
    last_self_heal_at: lastSelfHealAt,
    shield_pulse,
  };
}

export async function checkUiIncidentRadar(): Promise<UiIncidentRadar> {
  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - UI_INCIDENT_WINDOW_MS).toISOString();
  const { data, error } = await admin
    .from('publish_logs')
    .select('published_at')
    .eq('channel', 'ui_incident')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(1);

  if (error) {
    return { ok: false, error: error.message };
  }

  const hit = data?.[0];
  if (!hit) {
    return { ok: true };
  }

  /** 클라이언트 복구 후 motherbrain-heal 이 성공 로그를 남기면 레드 오탐 방지 */
  const { data: healRows, error: healErr } = await admin
    .from('publish_logs')
    .select('published_at, meta')
    .eq('channel', 'system_health')
    .eq('target_type', 'motherbrain_heal')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(24);

  if (healErr) {
    return { ok: false, error: healErr.message };
  }

  const incidentAt = Date.parse(hit.published_at);
  const healedAfter = (healRows ?? []).some((row) => {
    const m = row.meta as Record<string, unknown> | null;
    if (m?.event !== 'motherbrain_heal_ok') return false;
    return Date.parse(row.published_at) > incidentAt;
  });

  if (healedAfter) {
    return { ok: true };
  }

  return {
    ok: false,
    error: 'recent_ui_render_error',
    last_incident_at: hit.published_at,
  };
}
