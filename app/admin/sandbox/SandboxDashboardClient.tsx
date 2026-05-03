'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import CodePreview from './CodePreview';

export type SandboxProposalRow = {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  language: string;
  code_text: string;
  pipeline_kind: string | null;
  source: string;
  status: string;
  trigger_context: unknown;
  external_ref: string | null;
};

export type ActiveScriptLite = {
  slug: string;
  title: string;
  enabled: boolean;
  last_run_at: string | null;
  last_run_ok: boolean | null;
  proposal_id: string | null;
};

export default function SandboxDashboardClient({
  proposals,
  activeScripts,
}: {
  proposals: SandboxProposalRow[];
  activeScripts: ActiveScriptLite[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(proposals[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const selected = useMemo(
    () => proposals.find((p) => p.id === selectedId) ?? null,
    [proposals, selectedId],
  );

  const inject = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/sandbox/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ proposalId: selected.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; slug?: string };
      if (!res.ok) {
        setMsg(data.error ?? `inject_failed:${res.status}`);
        return;
      }
      setMsg(`주입 완료 — active_scripts.slug = ${data.slug ?? '?'}`);
      router.refresh();
    } catch {
      setMsg('network_error');
    } finally {
      setBusy(false);
    }
  }, [router, selected]);

  return (
    <div className="sandbox-dash space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-violet-400/90">Self-Evolution · Sandbox</p>
        <h1 className="text-2xl font-black text-white md:text-3xl">AI 스크립트 샌드박스</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
          도커 <strong className="text-slate-300">ai-watchdog</strong> 등이 제안한 파이프라인 초안을 검토한 뒤, 저장소 파일을 직접 고치지 않고{' '}
          <code className="rounded bg-white/10 px-1 text-slate-200">active_scripts</code> 테이블에 주입합니다. 크론{' '}
          <code className="rounded bg-white/10 px-1">GET /api/cron/run-sandbox-scripts</code>가 활성 스크립트를 불러와 서버에서만 실행합니다(
          <strong className="text-amber-200/90">신뢰된 오너 코드 전제 · AsyncFunction</strong>).
        </p>
      </header>

      {msg ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            msg.startsWith('주입 완료')
              ? 'border-emerald-500/35 bg-emerald-950/40 text-emerald-50'
              : 'border-rose-500/35 bg-rose-950/35 text-rose-50'
          }`}
        >
          {msg}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">제안 큐</h2>
          <ul className="max-h-[min(70vh,720px)] space-y-2 overflow-auto pr-1">
            {proposals.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-sm text-slate-500">
                아직 제안이 없습니다. 워치독에{' '}
                <code className="text-slate-400">SANDBOX_PROPOSAL_INGEST_URL</code> + 시크릿을 넣거나 수동으로 DB에 삽입해 보세요.
              </li>
            ) : (
              proposals.map((p) => {
                const on = p.id === selectedId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        on
                          ? 'border-violet-400/50 bg-violet-950/35 shadow-[0_0_24px_rgba(139,92,246,0.15)]'
                          : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'
                      }`}
                    >
                      <p className="font-bold text-white">{p.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {p.pipeline_kind ? `[${p.pipeline_kind}] ` : ''}
                        {p.description ?? '설명 없음'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide">
                        <span className="rounded-md bg-black/40 px-2 py-0.5 text-slate-400">{p.source}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 ${
                            p.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-200'
                              : p.status === 'accepted'
                                ? 'bg-emerald-500/15 text-emerald-200'
                                : 'bg-slate-600/30 text-slate-300'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="flex min-h-[420px] flex-col gap-4">
          {selected ? (
            <>
              <CodePreview code={selected.code_text} language={selected.language} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  크론 실행 시 코드는 <strong className="text-slate-400">AsyncFunction 본문</strong>으로 감싸집니다.{' '}
                  <code className="text-slate-400">await</code> 가능 · 노출 API는 <code className="text-slate-400">ctx.log</code>,{' '}
                  <code className="text-slate-400">ctx.nowIso</code> 정도로 제한됩니다.
                </p>
                <button
                  type="button"
                  disabled={busy || selected.status !== 'pending'}
                  onClick={() => void inject()}
                  className="shrink-0 rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-sky-500 px-8 py-4 text-base font-black text-white shadow-[0_12px_40px_rgba(139,92,246,0.35)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? '주입 중…' : '🚀 이 기능 사이트에 즉시 적용 (Inject)'}
                </button>
              </div>
              {selected.status !== 'pending' ? (
                <p className="text-xs text-amber-200/80">이 제안은 이미 처리되었습니다. 동일 슬러그로 다시 주입하려면 새 제안을 만드세요.</p>
              ) : null}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-500">
              제안을 선택하세요.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">주입된 active_scripts</h2>
        <ul className="mt-4 divide-y divide-white/10">
          {activeScripts.length === 0 ? (
            <li className="py-4 text-sm text-slate-500">아직 없음</li>
          ) : (
            activeScripts.map((a) => (
              <li key={a.slug} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="font-mono text-violet-300">{a.slug}</span>
                <span className="text-slate-300">{a.title}</span>
                <span className="text-xs text-slate-500">{a.enabled ? 'enabled' : 'disabled'}</span>
                {a.last_run_at ? (
                  <span className="text-xs text-slate-500">
                    last_run {a.last_run_ok === false ? '✗' : '✓'} {new Date(a.last_run_at).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-xs text-slate-600">미실행</span>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
