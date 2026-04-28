'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type LogRow = {
  id: string;
  pipelineId: string;
  event: string;
  status: string;
  at: string;
  reason: string;
  isActivePause: boolean;
};

function badgeTone(row: LogRow) {
  if (row.event === 'self_heal_pause') return 'bg-amber-500/10 text-amber-400 border-amber-500/40';
  if (row.status === 'success') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40';
  if (row.status === 'failed') return 'bg-rose-500/10 text-rose-400 border-rose-500/40';
  return 'bg-slate-700/40 text-slate-300 border-slate-600';
}

export default function OpsLogStreamClient({ rows }: { rows: LogRow[] }) {
  const router = useRouter();
  const [runningId, setRunningId] = useState('');
  const [note, setNote] = useState('');

  async function forceResume(pipelineId: string) {
    setRunningId(pipelineId);
    setNote('');
    try {
      const res = await fetch('/api/admin/ops/force-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId }),
      });
      const body = (await res.json()) as { error?: string; trigger?: string };
      if (!res.ok) throw new Error(body.error ?? 'force_resume_failed');
      setNote(`재가동 완료: ${pipelineId} (${body.trigger ?? 'triggered'})`);
      router.refresh();
    } catch (error) {
      setNote(error instanceof Error ? error.message : '강제 재가동 실패');
    } finally {
      setRunningId('');
    }
  }

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="truncate text-sm font-semibold text-slate-100">📡 파이프라인 라이브 스트림</h2>
        {note ? <p className="truncate text-xs text-cyan-300">{note}</p> : null}
      </div>
      <div className="max-h-[440px] space-y-2 overflow-auto pr-1">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-2 text-xs"
          >
            <span className={`rounded-full border px-2 py-0.5 font-semibold ${badgeTone(row)}`}>
              {row.event}
            </span>
            <span className="truncate text-slate-200">{row.pipelineId}</span>
            <span className="truncate text-slate-400">{row.status}</span>
            <span className="truncate text-slate-500">{new Date(row.at).toLocaleString()}</span>
            <span className="truncate text-slate-400">{row.reason || '-'}</span>
            {row.isActivePause ? (
              <button
                type="button"
                disabled={Boolean(runningId)}
                onClick={() => void forceResume(row.pipelineId)}
                className="ml-auto rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-300 disabled:opacity-50"
              >
                {runningId === row.pipelineId ? '재가동 중...' : '⚡ 강제 재가동'}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
