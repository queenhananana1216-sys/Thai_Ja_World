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
      className="mb-4 rounded-2xl border border-slate-700 bg-slate-800/60 p-4 backdrop-blur"
    >
      <h2 className="mb-2 text-sm font-semibold text-slate-100">통합 실행</h2>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={running}
          onClick={() => void run('all')}
          className="rounded-md border border-slate-500 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          전체 실행
        </button>
        <button
          type="button"
          disabled={running}
          onClick={() => void run('failed_only')}
          className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          실패만 재실행
        </button>
        {summary ? <span className="truncate text-xs text-slate-300">{summary}</span> : null}
      </div>

      {details.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {details.map((d) => (
            <div
              key={`${d.step}-${d.run_id ?? 'skip'}`}
              className={`rounded-md border px-2 py-2 text-xs ${d.success ? 'border-slate-600 bg-slate-900 text-slate-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'}`}
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

