/**
 * POST /api/health/motherbrain-heal
 * 글로벌/세그먼트 에러 복구용 — 주요 라우트 ISR(revalidatePath) + (선택) PostgREST 스키마 NOTIFY.
 *
 * 클라이언트: report-ui-error 와 동일하게 x-tj-ui-incident-key 가 설정된 경우에만 허용.
 * 크론·운영: Authorization: Bearer CRON_SECRET + JSON { "deep": true } 시 RPC chaos_monkey_notify_pgrst_reload_schema.
 */
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { purgeOmniAlertLogs } from '@/lib/health/purgeOmniAlertLogs';
import { revalidateMotherbrainPaths } from '@/lib/server/motherbrainRevalidate';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_CHARS = 4000;

export async function POST(req: Request): Promise<NextResponse> {
  const expected = process.env.UI_INCIDENT_INGEST_KEY?.trim();
  const sent = req.headers.get('x-tj-ui-incident-key')?.trim();
  const cronDeep = isCronAuthorized(req.headers.get('authorization'));

  if (expected && sent !== expected && !cronDeep) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) {
    return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
  }

  let pathname: string | undefined;
  let deep = false;
  /** 크론 전용 — 오래된 파이프라인 오류 스냅샷만 정리(운세·레이더 false positive 완화) */
  let pipeline_error_retention_hours: number | undefined;
  if (text.trim()) {
    try {
      const o = JSON.parse(text) as Record<string, unknown>;
      if (typeof o.pathname === 'string') pathname = o.pathname;
      if (o.deep === true) deep = true;
      const pr = o.pipeline_error_retention_hours;
      if (typeof pr === 'number' && Number.isFinite(pr) && pr >= 24 && pr <= 24 * 30) {
        pipeline_error_retention_hours = Math.floor(pr);
      }
    } catch {
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }
  }

  const n = revalidateMotherbrainPaths(pathname);

  let pgrst_ok: boolean | null = null;
  const admin = createServiceRoleClient();
  if (deep && cronDeep) {
    const { error } = await admin.rpc('chaos_monkey_notify_pgrst_reload_schema');
    pgrst_ok = !error;
    if (error) {
      console.error('[motherbrain-heal] pgrst reload rpc failed', error.message);
    }
  }

  let pipeline_purge_removed: number | null = null;
  if (
    cronDeep &&
    typeof pipeline_error_retention_hours === 'number'
  ) {
    const cutoff = new Date(Date.now() - pipeline_error_retention_hours * 3600 * 1000).toISOString();
    const del = await admin.from('pipeline_error_events').delete().lt('created_at', cutoff).select('id');
    pipeline_purge_removed = del.error ? null : del.data?.length ?? 0;
    if (del.error) {
      console.error('[motherbrain-heal] pipeline_error_events purge:', del.error.message);
    }
  }

  try {
    await admin.from('publish_logs').insert({
      channel: 'system_health',
      target_type: 'motherbrain_heal',
      target_id: cronDeep ? 'cron_deep' : 'client',
      meta: {
        event: 'motherbrain_heal_ok',
        pathname: pathname?.slice(0, 1024) ?? '',
        deep_pgrst_attempted: deep && cronDeep,
        pipeline_error_purge_removed: pipeline_purge_removed,
        at: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error('[motherbrain-heal] publish_logs insert failed', e);
  }

  try {
    const purged = await purgeOmniAlertLogs(admin);
    if (purged.error) {
      console.error('[motherbrain-heal] purgeOmniAlertLogs failed', purged.error);
    } else {
      console.info('[motherbrain-heal] omni alert logs purged', {
        ui_incident_deleted: purged.ui_incident_deleted,
        shadow_qa_failed_deleted: purged.shadow_qa_failed_deleted,
      });
    }
  } catch (e) {
    console.error('[motherbrain-heal] purgeOmniAlertLogs exception', e);
  }

  return NextResponse.json({
    ok: true,
    revalidated_paths: n,
    deep_pgrst: deep && cronDeep ? pgrst_ok : null,
    pipeline_error_purge_removed: pipeline_purge_removed,
  });
}
