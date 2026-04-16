'use client';

import Link from 'next/link';
import type { EntryFlowResponse } from '@/lib/landing/types';

interface EntryFlowSectionProps {
  flow: EntryFlowResponse;
}

export function EntryFlowSection({ flow }: EntryFlowSectionProps) {
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
              locale: 'ko',
              path: typeof window !== 'undefined' ? window.location.pathname : '/landing',
              event_type: 'click',
              target_role: 'entry_flow',
              target_text: `${laneId}:${cta}`,
              meta: {
                entry_lane_id: laneId,
                entry_cta: cta,
                source: 'entry_flow_section',
              },
            },
          ],
        }),
        keepalive: true,
      });
    } catch {
      // tracking failure should not interrupt navigation
    }
  }

  return (
    <section className="bg-[linear-gradient(180deg,#090b1d_0%,#100d28_100%)] py-14 text-slate-100 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200/90">Start Here</p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">처음 오셨다면, 이 순서대로 시작하세요</h2>
            <p className="mt-2 text-sm text-slate-300">
              필요한 서비스가 섞여 보이지 않도록 거래/구인구직/로컬가게/미니홈을 분리했습니다.
            </p>
          </div>
          <p className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-slate-300">
            자동 업데이트: {new Date(flow.generatedAt).toLocaleString('ko-KR')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {flow.lanes.map((lane, idx) => (
            <article
              key={lane.id}
              className="rounded-3xl border border-white/10 bg-white/4 p-5 shadow-[0_12px_35px_rgba(2,6,23,0.45)] backdrop-blur"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-lg font-bold">{lane.title}</p>
                <span className="rounded-full border border-violet-300/35 bg-violet-300/10 px-2.5 py-1 text-[11px] font-semibold text-violet-100">
                  추천 {idx + 1}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">{lane.description}</p>
              <p className="mt-3 rounded-lg border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                {lane.signal}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={lane.primaryHref}
                  onClick={() => void trackLaneClick(lane.id, 'primary')}
                  className="rounded-xl bg-[linear-gradient(120deg,#c4b5fd,#f9a8d4)] px-4 py-2 text-sm font-bold text-slate-950 no-underline transition hover:brightness-110"
                >
                  {lane.primaryLabel}
                </Link>
                {lane.secondaryHref && lane.secondaryLabel ? (
                  <Link
                    href={lane.secondaryHref}
                    onClick={() => void trackLaneClick(lane.id, 'secondary')}
                    className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 no-underline transition hover:bg-white/10"
                  >
                    {lane.secondaryLabel}
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
