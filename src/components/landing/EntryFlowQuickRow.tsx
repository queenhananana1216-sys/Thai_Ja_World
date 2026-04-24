'use client';

import Link from 'next/link';
import type { EntryFlowResponse } from '@/lib/landing/types';
import type { Locale } from '@/i18n/types';

export function EntryFlowQuickRow({ flow, locale = 'ko' }: { flow: EntryFlowResponse; locale?: Locale }) {
  const lanes = flow.lanes;
  if (lanes.length === 0) return null;
  const s = flow.snapshot;

  function getSessionId(): string {
    try {
      const key = 'tj_ux_session_id';
      const saved = window.sessionStorage.getItem(key);
      if (saved) return saved;
      const created = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(key, created);
      return created;
    } catch {
      return `entry_fallback_${Date.now()}`;
    }
  }

  async function trackLaneClick(laneId: string, cta: 'primary' | 'secondary') {
    try {
      await fetch('/api/ux/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [
            {
              session_id: getSessionId(),
              locale,
              path: typeof window !== 'undefined' ? window.location.pathname : '/',
              event_type: 'click',
              target_role: 'entry_flow',
              target_text: `${laneId}:${cta}`,
              meta: {
                entry_lane_id: laneId,
                entry_cta: cta,
                source: 'entry_flow_quick_row',
              },
            },
          ],
        }),
        keepalive: true,
      });
    } catch {
      /* empty */
    }
  }

  const iconFor: Record<string, string> = {
    trade: '⚡',
    job: '💼',
    local: '🏪',
    minihome: '🏡',
  };

  const statLine =
    locale === 'th'
      ? `7d: โพสต์ ${s.posts7d} · ตลาด ${s.flea7d} · งาน ${s.job7d} · ร้าน ${s.publishedShops}`
      : `7d: 광장 ${s.posts7d} · 번개 ${s.flea7d} · 구인 ${s.job7d} · 공개로컬 ${s.publishedShops}`;

  return (
    <div>
      <p className="mb-2 m-0 text-[11px] text-slate-500">{statLine}</p>
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="시작 가이드 바로가기"
      >
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className="flex flex-col rounded-lg border border-white/10 bg-slate-800/50 p-3 shadow-sm ring-1 ring-white/5 backdrop-blur-sm"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none" aria-hidden>
                {iconFor[lane.id] ?? '·'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-sm font-extrabold text-slate-100">{lane.title}</p>
                <p className="mt-1 m-0 line-clamp-2 text-xs leading-snug text-slate-400">{lane.description}</p>
              </div>
            </div>
            <p className="mt-2 m-0 line-clamp-2 rounded border border-amber-500/20 bg-amber-950/40 px-2 py-1 text-[11px] leading-tight text-amber-200/90">
              {lane.signal}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Link
                href={lane.primaryHref}
                onClick={() => void trackLaneClick(lane.id, 'primary')}
                className="inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-violet-600 px-2.5 text-center text-xs font-bold text-white no-underline hover:bg-violet-500"
              >
                {lane.primaryLabel}
              </Link>
              {lane.secondaryHref && lane.secondaryLabel ? (
                <Link
                  href={lane.secondaryHref}
                  onClick={() => void trackLaneClick(lane.id, 'secondary')}
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-white/15 bg-slate-800/80 px-2.5 text-center text-xs font-semibold text-slate-200 no-underline hover:border-white/25 hover:bg-slate-700/80"
                >
                  {lane.secondaryLabel}
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
