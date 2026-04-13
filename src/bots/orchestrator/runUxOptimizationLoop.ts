import { randomUUID } from 'node:crypto';
import { logFail, logStart, logSuccess } from '@/bots/logging/botActionLogger';
import { createServiceRoleClient } from '@/lib/supabase/admin';

const BOT_NAME = 'ux_admin_optimizer';

type UxEventRow = {
  path: string;
  event_type: 'page_view' | 'click' | 'dead_click' | 'js_error' | 'api_error';
  target_text: string | null;
};

type UxLoopResult = {
  ok: boolean;
  run_id: string;
  metrics?: {
    total: number;
    page_view: number;
    click: number;
    dead_click: number;
    js_error: number;
    api_error: number;
    dead_click_rate: number;
  };
  flags?: Record<string, boolean>;
  error?: string;
};

function floorTo5mIso(d: Date): string {
  const ms = d.getTime();
  const floored = Math.floor(ms / (5 * 60_000)) * 5 * 60_000;
  return new Date(floored).toISOString();
}

export async function runUxOptimizationLoop(windowMinutes = 15): Promise<UxLoopResult> {
  const run_id = randomUUID();
  const rowId = await logStart({
    run_id,
    bot_name: BOT_NAME,
    action_type: 'analyze',
    objective: '24h UI 동선/클릭 기반 자동 개선 플래그 조정',
    target_entity: 'ux',
    priority: 1,
    input_payload: { window_minutes: windowMinutes },
  });

  try {
    const admin = createServiceRoleClient();
    const sinceIso = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { data, error } = await admin
      .from('ux_events')
      .select('path,event_type,target_text')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as UxEventRow[];
    const totals = {
      total: rows.length,
      page_view: 0,
      click: 0,
      dead_click: 0,
      js_error: 0,
      api_error: 0,
    };
    let localView = 0;
    let localQrClick = 0;
    let localMinihomeClick = 0;

    for (const r of rows) {
      if (r.event_type === 'page_view') totals.page_view += 1;
      if (r.event_type === 'click') totals.click += 1;
      if (r.event_type === 'dead_click') totals.dead_click += 1;
      if (r.event_type === 'js_error') totals.js_error += 1;
      if (r.event_type === 'api_error') totals.api_error += 1;

      if (r.path.startsWith('/local')) {
        if (r.event_type === 'page_view') localView += 1;
        if (r.event_type === 'click') {
          const t = (r.target_text ?? '').toLowerCase();
          if (t.includes('qr')) localQrClick += 1;
          if (t.includes('미니홈') || t.includes('มินิโฮม')) localMinihomeClick += 1;
        }
      }
    }

    const deadClickRate = totals.click > 0 ? totals.dead_click / totals.click : 0;
    const enableSearchAssist = totals.page_view >= 80 && deadClickRate >= 0.08;
    const enableQrEmphasis =
      localView >= 20 && localMinihomeClick > 0 && localQrClick * 3 < localMinihomeClick;

    const flagRows = [
      {
        flag_key: 'global.search_assist',
        flag_value: { enabled: enableSearchAssist },
        active: true,
        reason: `dead_click_rate=${deadClickRate.toFixed(4)}`,
        updated_by: BOT_NAME,
        updated_at: new Date().toISOString(),
      },
      {
        flag_key: 'local.qr_emphasis',
        flag_value: { enabled: enableQrEmphasis },
        active: true,
        reason: `local_views=${localView}, local_qr_click=${localQrClick}, local_minihome_click=${localMinihomeClick}`,
        updated_by: BOT_NAME,
        updated_at: new Date().toISOString(),
      },
    ];
    const { error: flagErr } = await admin.from('ux_flag_overrides').upsert(flagRows, {
      onConflict: 'flag_key',
    });
    if (flagErr) throw new Error(flagErr.message);

    const metricsRow = {
      window_start: floorTo5mIso(new Date()),
      totals: {
        ...totals,
        dead_click_rate: deadClickRate,
        local_views: localView,
        local_qr_click: localQrClick,
        local_minihome_click: localMinihomeClick,
      },
      created_at: new Date().toISOString(),
    };
    await admin.from('ux_metrics_5m').upsert(metricsRow, { onConflict: 'window_start' });

    const result: UxLoopResult = {
      ok: true,
      run_id,
      metrics: {
        ...totals,
        dead_click_rate: deadClickRate,
      },
      flags: {
        global_search_assist: enableSearchAssist,
        local_qr_emphasis: enableQrEmphasis,
      },
    };

    if (rowId) {
      await logSuccess(rowId, {
        output_payload: result as unknown as Record<string, unknown>,
        metrics_after: result.metrics as unknown as Record<string, unknown>,
      });
    }
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'ux_loop_failed';
    if (rowId) {
      await logFail(rowId, {
        error_code: 'UX_LOOP_FAILED',
        error_message: message,
        current_retry_count: 0,
      });
    }
    return { ok: false, run_id, error: message };
  }
}

