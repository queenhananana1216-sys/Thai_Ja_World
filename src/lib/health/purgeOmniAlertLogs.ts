import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

const SHADOW_QA_PIPELINE = 'cron/shadow-qa';

export type PurgeOmniAlertLogsResult = {
  ui_incident_deleted: number;
  shadow_qa_failed_deleted: number;
  error?: string;
};

/**
 * 관제탑(omni-radar) 빨간불 원인이 되는 클라이언트 UI 사고 로그와 Shadow QA 실패 크론 행을 제거한다.
 * 치유·순찰 성공 직후 호출해 레이더가 즉시 초록으로 돌아가게 한다.
 */
export async function purgeOmniAlertLogs(admin: SupabaseClient): Promise<PurgeOmniAlertLogsResult> {
  const { data: uiRows, error: uiErr } = await admin
    .from('publish_logs')
    .delete()
    .eq('channel', 'ui_incident')
    .select('id');

  if (uiErr) {
    return { ui_incident_deleted: 0, shadow_qa_failed_deleted: 0, error: uiErr.message };
  }

  const { data: shadowRows, error: shadowErr } = await admin
    .from('publish_logs')
    .delete()
    .eq('channel', 'cron_pipeline')
    .eq('target_type', 'cron_pipeline')
    .eq('target_id', SHADOW_QA_PIPELINE)
    .filter('meta->>event', 'eq', 'shadow_qa_cycle')
    .filter('meta->>status', 'eq', 'failed')
    .select('id');

  if (shadowErr) {
    return {
      ui_incident_deleted: uiRows?.length ?? 0,
      shadow_qa_failed_deleted: 0,
      error: shadowErr.message,
    };
  }

  return {
    ui_incident_deleted: uiRows?.length ?? 0,
    shadow_qa_failed_deleted: shadowRows?.length ?? 0,
  };
}
