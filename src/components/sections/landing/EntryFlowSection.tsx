'use client';

import Link from 'next/link';
import { portBodyText, portPrimaryBtn, portSecondaryBtn, portWidgetCard, portWidgetKicker } from '@/lib/landing/portalWidgetStyle';
import type { EntryFlowResponse } from '@/lib/landing/types';

type PortalHead = { kicker: string; title: string; sub: string };

interface EntryFlowSectionProps {
  flow: EntryFlowResponse;
  variant?: 'legacy' | 'portal';
  /** `portal`에서만: i18n에서 합쳐진 머릿말(서버에서 props로) */
  portalHead?: PortalHead;
}

export function EntryFlowSection({
  flow,
  variant = 'legacy',
  portalHead,
}: EntryFlowSectionProps) {
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

  if (variant === 'portal' && portalHead) {
    return (
      <section className="pt-0" data-variant="entry-flow-portal" aria-labelledby="tj-entry-flow-portal-title">
        <div className="mb-3 min-w-0 sm:mb-4">
          <p className={`m-0 inline-block rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 ${portWidgetKicker}`}>
            {portalHead.kicker}
          </p>
          <h2
            id="tj-entry-flow-portal-title"
            className="mt-2 text-sm font-extrabold text-slate-800 sm:text-base"
          >
            {portalHead.title}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-[0.8125rem]">{portalHead.sub}</p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 min-[500px]:grid-cols-2 min-[500px]:gap-3">
          {flow.lanes.map((lane) => (
            <article key={lane.id} className={portWidgetCard + ' p-3.5 sm:p-4'}>
              <p className="m-0 text-sm font-extrabold leading-tight text-slate-800">{lane.title}</p>
              <p className={'mt-1.5 m-0 ' + portBodyText + ' line-clamp-2'}>{lane.description}</p>
              <p className="mt-2.5 rounded-lg border border-amber-200/60 bg-amber-50/80 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-amber-950 line-clamp-2">
                {lane.signal}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={lane.primaryHref}
                  className={portPrimaryBtn + ' min-h-9 min-w-0 flex-1 basis-[9rem]'}
                  onClick={() => void trackLaneClick(lane.id, 'primary')}
                >
                  {lane.primaryLabel}
                </Link>
                {lane.secondaryHref && lane.secondaryLabel ? (
                  <Link
                    href={lane.secondaryHref}
                    className={portSecondaryBtn + ' min-h-9 min-w-0 flex-1 basis-[9rem]'}
                    onClick={() => void trackLaneClick(lane.id, 'secondary')}
                  >
                    {lane.secondaryLabel}
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        padding: '46px 0 52px',
        background: 'linear-gradient(180deg,#090b1d 0%,#0f1024 100%)',
        color: '#e2e8f0',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 16px' }}>
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                display: 'inline-flex',
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid rgba(196,181,253,0.4)',
                color: '#ddd6fe',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              START HERE
            </p>
            <h2 style={{ margin: '10px 0 0', fontSize: 'clamp(24px,4.6vw,34px)', lineHeight: 1.25, fontWeight: 800 }}>
              태자월드 시작 가이드
            </h2>
            <p style={{ margin: '10px 0 0', fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
              거래, 구인구직, 로컬가게, 미니홈을 한눈에 보고 바로 이동할 수 있게 정리했습니다.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {flow.lanes.map((lane) => (
            <article
              key={lane.id}
              style={{
                borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.04)',
                padding: 16,
                boxShadow: '0 12px 35px rgba(2,6,23,0.45)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 19, fontWeight: 800, lineHeight: 1.3 }}>{lane.title}</p>
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#cbd5e1' }}>{lane.description}</p>
              <p
                style={{
                  margin: '12px 0 0',
                  borderRadius: 10,
                  border: '1px solid rgba(251,191,36,0.35)',
                  background: 'rgba(251,191,36,0.12)',
                  padding: '8px 10px',
                  fontSize: 12,
                  color: '#fde68a',
                  lineHeight: 1.5,
                }}
              >
                {lane.signal}
              </p>
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Link
                  href={lane.primaryHref}
                  onClick={() => void trackLaneClick(lane.id, 'primary')}
                  style={{
                    borderRadius: 12,
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 14px',
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#0f172a',
                    textDecoration: 'none',
                    background: 'linear-gradient(120deg,#c4b5fd,#f9a8d4)',
                  }}
                >
                  {lane.primaryLabel}
                </Link>
                {lane.secondaryHref && lane.secondaryLabel ? (
                  <Link
                    href={lane.secondaryHref}
                    onClick={() => void trackLaneClick(lane.id, 'secondary')}
                    style={{
                      borderRadius: 12,
                      minHeight: 44,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px 14px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#f1f5f9',
                      textDecoration: 'none',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(255,255,255,0.06)',
                    }}
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
