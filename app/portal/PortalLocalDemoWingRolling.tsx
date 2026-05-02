'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PortalLocalDemoWingCard } from '../lib/home/fetchPortalHomeFeed';

/** `is_demo` 로컬 폴백 — SSR에서 받은 카드만 롤링 (전역 상태 없음) */
export default function PortalLocalDemoWingRolling({ cards }: { cards: PortalLocalDemoWingCard[] }) {
  const safe = cards.filter((c) => c?.id?.trim() && c?.name?.trim());
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (safe.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % safe.length);
    }, 5200);
    return () => window.clearInterval(t);
  }, [safe.length]);

  if (safe.length === 0) return null;

  const c = safe[idx % safe.length] ?? safe[0];
  if (!c) return null;

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-amber-200/85">입점 맛집 · 추천</p>
      <div className="overflow-hidden rounded-xl border border-amber-400/30 bg-gradient-to-b from-slate-900/95 to-slate-950 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-800/90">
          {c.imageUrl ? (
            <img src={c.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full min-h-[7rem] w-full items-center justify-center bg-gradient-to-br from-amber-900/50 via-slate-900 to-slate-950 text-5xl leading-none">
              {c.emoji}
            </div>
          )}
          <div className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-100 backdrop-blur-sm">
            예약 가능
          </div>
        </div>
        <div className="space-y-1.5 p-2.5">
          <div>
            <p className="text-[11px] font-extrabold leading-tight tracking-tight text-slate-50">{c.name}</p>
            <p className="text-[9px] text-slate-500">
              {c.region}
              {c.region && c.category ? ' · ' : ''}
              {c.category}
            </p>
          </div>
          {c.tagline ? (
            <p className="line-clamp-2 text-[10px] leading-snug text-slate-400">{c.tagline}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Link
              prefetch={true}
              href={c.shopHref}
              className="inline-flex min-h-[2rem] flex-1 items-center justify-center rounded-lg border border-amber-400/45 bg-amber-500/15 px-2 text-center text-[10px] font-extrabold text-amber-50 shadow-inner shadow-amber-900/20 transition hover:border-amber-300/70 hover:bg-amber-500/25"
            >
              미니홈 가기
            </Link>
            <Link
              prefetch={true}
              href="/local"
              className="inline-flex min-h-[2rem] items-center justify-center rounded-lg border border-slate-600/90 px-2.5 text-[9px] font-semibold text-slate-400 transition hover:border-slate-500 hover:text-amber-200"
            >
              로컬 허브
            </Link>
          </div>
        </div>
      </div>
      {safe.length > 1 ? (
        <p className="text-center text-[9px] text-slate-500">
          {idx + 1} / {safe.length} · 자동 전환
        </p>
      ) : null}
    </div>
  );
}
