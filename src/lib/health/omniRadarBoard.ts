import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';

const SHADOW_QA_PIPELINE = 'cron/shadow-qa';
const SHADOW_SUCCESS_MAX_AGE_MS = 45 * 60 * 1000;
const UI_INCIDENT_WINDOW_MS = 30 * 60 * 1000;

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
  if (hit) {
    return {
      ok: false,
      error: 'recent_ui_render_error',
      last_incident_at: hit.published_at,
    };
  }

  return { ok: true };
}
