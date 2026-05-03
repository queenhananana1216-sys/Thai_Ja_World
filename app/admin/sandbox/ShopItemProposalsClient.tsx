'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

export type ShopItemProposalRow = {
  id: string;
  created_at: string;
  status: string;
  source: string;
  item_key: string;
  category: string;
  label_ko: string;
  label_th: string;
  price_points: number;
  rental_days: number | null;
  rental_price: number | null;
  svg_markup: string | null;
  css_snippet: string | null;
};

export default function ShopItemProposalsClient({ proposals }: { proposals: ShopItemProposalRow[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(proposals[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const selected = useMemo(
    () => proposals.find((p) => p.id === selectedId) ?? null,
    [proposals, selectedId],
  );

  const approve = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/shop-item-proposals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ proposalId: selected.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; item_key?: string };
      if (!res.ok) {
        setMsg(data.error ?? `approve_failed:${res.status}`);
        return;
      }
      setMsg(`승인 완료 — style_shop_items 에 반영됨 (${data.item_key ?? '?'})`);
      router.refresh();
    } catch {
      setMsg('network_error');
    } finally {
      setBusy(false);
    }
  }, [router, selected]);

  return (
    <section className="space-y-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-slate-950/40 to-slate-950/80 p-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/90">Premium shop · AI queue</p>
        <h2 className="text-xl font-black text-white md:text-2xl">프리미엄 상점 아이템 제안</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
          <strong className="text-slate-200">ai-watchdog</strong> 또는 크론이 제안한 SVG/CSS 페이로드가 여기에 쌓입니다.{' '}
          <strong className="text-amber-100/90">[승인]</strong> 시 <code className="rounded bg-white/10 px-1">style_shop_items</code>에
          즉시 upsert 되어 <code className="rounded bg-white/10 px-1">/shop</code>·미니홈 상점에 노출됩니다.
        </p>
      </header>

      {msg ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            msg.startsWith('승인 완료')
              ? 'border-emerald-500/35 bg-emerald-950/40 text-emerald-50'
              : 'border-rose-500/35 bg-rose-950/35 text-rose-50'
          }`}
        >
          {msg}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">제안 큐</h3>
          <ul className="mt-2 max-h-[min(56vh,560px)] space-y-2 overflow-auto pr-1">
            {proposals.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-500">
                대기 중인 제안이 없습니다. 내부 ingest(
                <code className="text-slate-400">POST /api/internal/shop-item-proposals</code>) 또는 크론{' '}
                <code className="text-slate-400">/api/cron/suggest-premium-shop-items</code>를 연결하세요.
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
                          ? 'border-amber-400/45 bg-amber-950/30 shadow-[0_0_24px_rgba(245,158,11,0.12)]'
                          : 'border-white/10 bg-white/[0.04] hover:border-white/18'
                      }`}
                    >
                      <p className="font-bold text-white">{p.label_ko}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {p.item_key} · {p.category}
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

        <div className="flex min-h-[320px] flex-col gap-3">
          {selected ? (
            <>
              <dl className="grid gap-2 text-sm text-slate-300">
                <div>
                  <dt className="text-xs uppercase text-slate-500">가격</dt>
                  <dd>
                    {selected.price_points.toLocaleString('ko-KR')} 타이(THAI)
                    {selected.rental_days != null
                      ? ` · ${selected.rental_days}일권 (렌탈 ${selected.rental_price?.toLocaleString('ko-KR') ?? '—'})`
                      : ' · 영구'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">라벨 TH</dt>
                  <dd>{selected.label_th}</dd>
                </div>
              </dl>
              {selected.css_snippet ? (
                <pre className="max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/50 p-3 text-xs text-amber-100/90">
                  {selected.css_snippet}
                </pre>
              ) : null}
              {selected.svg_markup ? (
                <pre className="max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/50 p-3 text-xs text-sky-100/90">
                  {selected.svg_markup}
                </pre>
              ) : null}
              <button
                type="button"
                disabled={busy || selected.status !== 'pending'}
                onClick={() => void approve()}
                className="mt-auto shrink-0 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-900 px-8 py-3.5 text-base font-black text-slate-950 shadow-[0_12px_40px_rgba(245,158,11,0.25)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? '처리 중…' : '승인 · 상점에 즉시 라이브'}
              </button>
              {selected.status !== 'pending' ? (
                <p className="text-xs text-amber-200/80">이 제안은 이미 처리되었습니다.</p>
              ) : null}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-500">
              제안을 선택하세요.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
