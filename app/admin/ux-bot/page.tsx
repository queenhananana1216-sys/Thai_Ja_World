import { createServiceRoleClient } from '@/lib/supabase/admin';
import UxBotRunButton from './_components/UxBotRunButton';

type FlagRow = {
  flag_key: string;
  flag_value: unknown;
  active: boolean;
  reason: string | null;
  updated_by: string | null;
  updated_at: string;
};

type MetricRow = {
  window_start: string;
  totals: unknown;
  created_at: string;
};

type UxBotActionRow = {
  id: string;
  run_id: string;
  status: 'running' | 'success' | 'failed' | 'skipped' | 'queued';
  created_at: string;
  finished_at: string | null;
  error_message: string | null;
  output_payload: unknown;
  metrics_after: unknown;
};

type UxFlagsSnapshot = {
  global_search_assist?: boolean;
  local_qr_emphasis?: boolean;
};

function pretty(v: unknown): string {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function readBoolean(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

function parseUxFlagsFromAction(row: UxBotActionRow): UxFlagsSnapshot {
  const payload = asRecord(row.output_payload);
  const flags = asRecord(payload.flags);
  return {
    global_search_assist: readBoolean(flags.global_search_assist),
    local_qr_emphasis: readBoolean(flags.local_qr_emphasis),
  };
}

function summarizeReason(row: UxBotActionRow): string {
  if (row.status !== 'success') {
    return row.error_message?.trim() || '실패/스킵 사유 미기록';
  }
  const metrics = asRecord(row.metrics_after);
  const rate = metrics.dead_click_rate;
  const total = metrics.total;
  const click = metrics.click;
  if (typeof rate === 'number') {
    return `dead_click_rate=${rate.toFixed(4)} · total=${typeof total === 'number' ? total : 0} · click=${typeof click === 'number' ? click : 0}`;
  }
  return '지표 정보 없음';
}

function summarizeDiff(current: UxFlagsSnapshot, prev: UxFlagsSnapshot | null): string {
  if (!prev) return '첫 기록 (비교 기준 없음)';
  const changes: string[] = [];
  if (current.global_search_assist !== prev.global_search_assist) {
    changes.push(
      `global.search_assist: ${String(prev.global_search_assist)} → ${String(current.global_search_assist)}`,
    );
  }
  if (current.local_qr_emphasis !== prev.local_qr_emphasis) {
    changes.push(
      `local.qr_emphasis: ${String(prev.local_qr_emphasis)} → ${String(current.local_qr_emphasis)}`,
    );
  }
  return changes.length > 0 ? changes.join(' | ') : '플래그 변경 없음';
}

export default async function AdminUxBotPage() {
  let flags: FlagRow[] = [];
  let metrics: MetricRow[] = [];
  let actions: UxBotActionRow[] = [];
  let note: string | null = null;

  try {
    const admin = createServiceRoleClient();
    const [flagRes, metricRes, actionRes] = await Promise.all([
      admin
        .from('ux_flag_overrides')
        .select('flag_key,flag_value,active,reason,updated_by,updated_at')
        .order('updated_at', { ascending: false })
        .limit(50),
      admin
        .from('ux_metrics_5m')
        .select('window_start,totals,created_at')
        .order('window_start', { ascending: false })
        .limit(60),
      admin
        .from('bot_actions')
        .select('id,run_id,status,created_at,finished_at,error_message,output_payload,metrics_after')
        .eq('bot_name', 'ux_admin_optimizer')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    if (flagRes.error) throw new Error(flagRes.error.message);
    if (metricRes.error) throw new Error(metricRes.error.message);
    if (actionRes.error) throw new Error(actionRes.error.message);
    flags = (flagRes.data ?? []) as FlagRow[];
    metrics = (metricRes.data ?? []) as MetricRow[];
    actions = (actionRes.data ?? []) as UxBotActionRow[];
  } catch (e) {
    note = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="admin-page">
      <h1 className="admin-dash__title">UX 관리자봇</h1>
      <p className="admin-dash__lead">
        5분 주기 크론이 수집된 UX 이벤트를 분석해 플래그를 조정합니다. 동작 엔드포인트:
        <code> /api/cron/ux-bot</code>
      </p>
      <UxBotRunButton />
      {note ? <div className="admin-dash__alert">{note}</div> : null}

      <section className="admin-dash__pipeline" style={{ marginBottom: 20 }}>
        <h2>최근 자동 조정 이력</h2>
        {actions.length === 0 ? (
          <p style={{ color: '#64748b' }}>봇 액션 기록이 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {actions.map((a, idx) => {
              const current = parseUxFlagsFromAction(a);
              const prevRow = actions[idx + 1];
              const prev = prevRow ? parseUxFlagsFromAction(prevRow) : null;
              const statusColor =
                a.status === 'success' ? '#16a34a' : a.status === 'failed' ? '#dc2626' : '#64748b';
              return (
                <article key={a.id} className="admin-dash__card">
                  <div className="admin-dash__card-label">
                    {new Date(a.created_at).toLocaleString('ko-KR')} ·{' '}
                    <span style={{ color: statusColor }}>{a.status}</span>
                  </div>
                  <div className="admin-dash__card-hint">run_id={a.run_id}</div>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#475569' }}>
                    사유: {summarizeReason(a)}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#0f172a' }}>
                    변경: {summarizeDiff(current, prev)}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="admin-dash__pipeline" style={{ marginBottom: 20 }}>
        <h2>현재 UX 플래그</h2>
        {flags.length === 0 ? (
          <p style={{ color: '#64748b' }}>플래그가 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {flags.map((f) => (
              <article key={f.flag_key} className="admin-dash__card">
                <div className="admin-dash__card-label">{f.flag_key}</div>
                <div className="admin-dash__card-hint">
                  active={String(f.active)} · by={f.updated_by ?? 'unknown'} ·{' '}
                  {new Date(f.updated_at).toLocaleString('ko-KR')}
                </div>
                {f.reason ? (
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>{f.reason}</p>
                ) : null}
                <pre
                  style={{
                    marginTop: 10,
                    background: '#0b1020',
                    color: '#dbeafe',
                    borderRadius: 8,
                    padding: 10,
                    overflowX: 'auto',
                    fontSize: 12,
                  }}
                >
                  {pretty(f.flag_value)}
                </pre>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-dash__pipeline">
        <h2>최근 5분 집계</h2>
        {metrics.length === 0 ? (
          <p style={{ color: '#64748b' }}>집계 데이터가 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {metrics.map((m) => (
              <article key={m.window_start} className="admin-dash__card">
                <div className="admin-dash__card-label">{new Date(m.window_start).toLocaleString('ko-KR')}</div>
                <pre
                  style={{
                    marginTop: 8,
                    background: '#111827',
                    color: '#e5e7eb',
                    borderRadius: 8,
                    padding: 10,
                    overflowX: 'auto',
                    fontSize: 12,
                  }}
                >
                  {pretty(m.totals)}
                </pre>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

