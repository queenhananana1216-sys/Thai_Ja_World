'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type AdminBannerLite = {
  id: string;
  title: string;
  placement: string | null;
  route_group: string | null;
  href: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

export default function AdminBannersClient({ rows }: { rows: AdminBannerLite[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, AdminBannerLite>>(
    Object.fromEntries(rows.map((row) => [row.id, { ...row }])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateDraft(id: string, patch: Partial<AdminBannerLite>) {
    setDrafts((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, ...patch } };
    });
  }

  async function saveRow(row: AdminBannerLite) {
    setError(null);
    setBusyId(row.id);
    try {
      const draft = drafts[row.id] ?? row;
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: row.id,
          title: draft.title,
          href: draft.href,
          is_active: Boolean(draft.is_active),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? `저장 실패 (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}
      <ul className="m-0 list-none space-y-2 p-0">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-3">
            <div className="mb-2 min-w-0">
              <p className="m-0 text-xs text-slate-400">
                {(row.placement ?? row.route_group ?? 'slot')} · sort {row.sort_order ?? 0}
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-center">
              <input
                value={drafts[row.id]?.title ?? ''}
                onChange={(e) => updateDraft(row.id, { title: e.target.value })}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="배너 제목"
              />
              <input
                value={drafts[row.id]?.href ?? ''}
                onChange={(e) => updateDraft(row.id, { href: e.target.value })}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                placeholder="https://..."
              />
              <label className="inline-flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={Boolean(drafts[row.id]?.is_active)}
                  onChange={(e) => updateDraft(row.id, { is_active: e.target.checked })}
                />
                노출 ON
              </label>
              <button
                type="button"
                onClick={() => void saveRow(row)}
                disabled={busyId === row.id}
                className="rounded-md border border-violet-300/40 bg-violet-500/20 px-3 py-2 text-xs font-semibold text-violet-100 disabled:cursor-wait disabled:opacity-70"
              >
                {busyId === row.id ? '저장 중…' : '저장'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
