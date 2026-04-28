'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LocalAppBanner from '../../../_components/home/LocalAppBanner';
import hubStyles from '../../../_components/home/home-hub.module.css';

export type AdminBannerLite = {
  id: string;
  title: string;
  subtitle: string | null;
  cta: string | null;
  placement: string | null;
  route_group: string | null;
  href: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

const TITLE_MAX = 12;
const DESC_MAX = 22;

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
          title: draft.title.slice(0, TITLE_MAX),
          subtitle: (draft.subtitle ?? '').slice(0, DESC_MAX),
          cta: (draft.cta ?? '').slice(0, DESC_MAX),
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
            <div className="grid gap-2 md:grid-cols-2">
              <div className="min-w-0">
                <input
                  value={drafts[row.id]?.title ?? ''}
                  maxLength={TITLE_MAX}
                  onChange={(e) => updateDraft(row.id, { title: e.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="배너 제목"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {(drafts[row.id]?.title ?? '').length} / {TITLE_MAX}
                </p>
              </div>
              <div className="min-w-0">
                <input
                  value={drafts[row.id]?.subtitle ?? ''}
                  maxLength={DESC_MAX}
                  onChange={(e) => updateDraft(row.id, { subtitle: e.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  placeholder="배너 설명"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {(drafts[row.id]?.subtitle ?? '').length} / {DESC_MAX}
                </p>
              </div>
              <div className="min-w-0">
                <input
                  value={drafts[row.id]?.cta ?? ''}
                  maxLength={DESC_MAX}
                  onChange={(e) => updateDraft(row.id, { cta: e.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  placeholder="CTA 문구"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {(drafts[row.id]?.cta ?? '').length} / {DESC_MAX}
                </p>
              </div>
              <div className="min-w-0">
                <input
                  value={drafts[row.id]?.href ?? ''}
                  onChange={(e) => updateDraft(row.id, { href: e.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-[auto_auto] md:items-center md:justify-between">
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
            <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/50 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-200">👁️ 실시간 미리보기 (Live Preview)</p>
              <div className="mx-auto w-[11.85rem]">
                <div className={hubStyles.localWingStack}>
                  <LocalAppBanner
                    tone="mobility"
                    badge={row.placement === 'wing_right' ? '배달K' : 'GRAB'}
                    detailBadge={(drafts[row.id]?.cta ?? '').slice(0, DESC_MAX) || undefined}
                    title={(drafts[row.id]?.title ?? '').slice(0, TITLE_MAX)}
                    subtitle={(drafts[row.id]?.subtitle ?? '').slice(0, DESC_MAX)}
                    cta={(drafts[row.id]?.cta ?? '').slice(0, DESC_MAX) || '쿠폰 받기'}
                    href={drafts[row.id]?.href ?? '#'}
                    chips={[]}
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
