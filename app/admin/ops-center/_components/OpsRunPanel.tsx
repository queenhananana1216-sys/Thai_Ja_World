'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type RunStep = {
  step: string;
  skipped: boolean;
  success: boolean;
  run_id?: string;
  error?: string;
};

type RunResponse = {
  status?: 'ok' | 'partial' | 'error';
  error?: string;
  mode?: 'all' | 'failed_only';
  results?: RunStep[];
};

export default function OpsRunPanel() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState<RunStep[]>([]);

  async function run(mode: 'all' | 'failed_only') {
    setRunning(true);
    setSummary(mode === 'all' ? '전체 파이프라인 실행 중...' : '실패 단계만 재실행 중...');
    setDetails([]);
    try {
      const res = await fetch('/api/admin/ops/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          windowMinutes: 15,
          newsItemsPerFeed: 5,
          newsLimit: 5,
          knowledgeItemsPerSource: 5,
          knowledgeLimit: 5,
        }),
      });
      const body = (await res.json()) as RunResponse;
      if (!res.ok || body.status === 'error') {
        throw new Error(body.error || '실행 실패');
      }
      const rows = Array.isArray(body.results) ? body.results : [];
      setDetails(rows);
      const failCount = rows.filter((r) => !r.success).length;
      const skipped = rows.filter((r) => r.skipped).length;
      if (failCount > 0) {
        setSummary(`일부 실패: ${failCount}건 실패, ${skipped}건 스킵`);
      } else {
        setSummary(`실행 완료: ${rows.length - skipped}건 실행, ${skipped}건 스킵`);
      }
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSummary(`실행 오류: ${msg}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: 12,
        padding: 14,
        background: '#f8fafc',
        marginBottom: 16,
      }}
    >
      <h2 style={{ margin: '0 0 10px', fontSize: 16 }}>통합 실행</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          disabled={running}
          onClick={() => void run('all')}
          style={{
            borderRadius: 8,
            border: '1px solid #0f172a',
            background: running ? '#cbd5e1' : '#0f172a',
            color: running ? '#334155' : '#fff',
            fontWeight: 700,
            fontSize: 12,
            padding: '8px 12px',
            cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          전체 실행
        </button>
        <button
          type="button"
          disabled={running}
          onClick={() => void run('failed_only')}
          style={{
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#fff',
            color: '#334155',
            fontWeight: 700,
            fontSize: 12,
            padding: '8px 12px',
            cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          실패만 재실행
        </button>
        {summary ? <span style={{ fontSize: 12, color: '#334155' }}>{summary}</span> : null}
      </div>

      {details.length > 0 ? (
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          {details.map((d) => (
            <div
              key={`${d.step}-${d.run_id ?? 'skip'}`}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                color: d.success ? '#0f172a' : '#991b1b',
              }}
            >
              {d.step} · {d.skipped ? 'skip' : d.success ? 'ok' : 'fail'}
              {d.error ? ` · ${d.error}` : ''}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

