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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleRow(row: AdminBannerLite) {
    setError(null);
    setBusyId(row.id);
    try {
      const res = await fetch('/api/admin/banners/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, is_active: !Boolean(row.is_active) }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? `토글 실패 (${res.status})`);
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
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-semibold text-slate-100">{row.title || '(제목 없음)'}</p>
              <p className="m-0 mt-1 text-xs text-slate-400">
                {(row.placement ?? row.route_group ?? 'slot')} · sort {row.sort_order ?? 0}
                {row.href ? ` · ${row.href}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void toggleRow(row)}
              disabled={busyId === row.id}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                row.is_active
                  ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-slate-400/30 bg-slate-800 text-slate-300'
              } disabled:cursor-wait disabled:opacity-70`}
            >
              {busyId === row.id ? '처리 중…' : row.is_active ? 'ON' : 'OFF'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
