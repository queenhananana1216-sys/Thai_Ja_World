'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import {
  bumpSponsorSignalsForPath,
  bumpSponsorSignalsFromDwell,
  parseSponsorSignalsCookie,
  TJ_SPONSOR_SIGNALS_COOKIE,
} from '@/lib/banners/sponsorIntentSignals';

function getSessionId(): string {
  try {
    const k = 'tj_analytics_sid';
    let id = sessionStorage.getItem(k);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(k, id);
    }
    return id;
  } catch {
    return `anon-${Date.now()}`;
  }
}

function readSignalsFromDocument() {
  const key = `${TJ_SPONSOR_SIGNALS_COOKIE}=`;
  const chip =
    typeof document !== 'undefined'
      ? document.cookie
          .split(';')
          .map((x) => x.trim())
          .find((x) => x.startsWith(key))
      : '';
  const raw = chip ? decodeURIComponent(chip.slice(key.length)) : '';
  return parseSponsorSignalsCookie(raw || null);
}

function persistSignalsCookie(next: ReturnType<typeof parseSponsorSignalsCookie>) {
  const value = encodeURIComponent(JSON.stringify(next));
  document.cookie = `${TJ_SPONSOR_SIGNALS_COOKIE}=${value};path=/;max-age=${86400 * 180};SameSite=Lax`;
}

async function sendEvents(sessionId: string, events: { kind: 'view' | 'click' | 'dwell'; route: string; dwell_ms?: number; ts: number }[]) {
  if (events.length === 0) return;
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, events }),
      keepalive: true,
    });
  } catch {
    /* 백그라운드 — 실패 무시 */
  }
}

/**
 * 체류·클릭·페이지뷰를 백그라운드로 전송 (레이아웃 최상단 1회 마운트)
 */
export default function AnalyticsTracker() {
  const pathname = usePathname() ?? '/';
  const segmentStartRef = useRef(Date.now());
  const prevPathRef = useRef<string | null>(null);
  const clickBufRef = useRef(0);
  const flushClicksRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sid = getSessionId();
    const now = Date.now();

    const flushDwellFor = (route: string, startMs: number): number => {
      const ms = Date.now() - startMs;
      if (ms < 800) return ms;
      void sendEvents(sid, [{ kind: 'dwell', route, dwell_ms: ms, ts: now }]);
      return ms;
    };

    if (prevPathRef.current !== null && prevPathRef.current !== pathname) {
      const prevRoute = prevPathRef.current;
      const dwellMs = flushDwellFor(prevRoute, segmentStartRef.current);
      try {
        if (dwellMs >= 10_000) {
          const prevSig = readSignalsFromDocument();
          persistSignalsCookie(bumpSponsorSignalsFromDwell(prevSig, prevRoute, dwellMs));
        }
      } catch {
        /* 쿠키 실패 무시 */
      }
      segmentStartRef.current = Date.now();
    }

    prevPathRef.current = pathname;
    try {
      const prevSig = readSignalsFromDocument();
      persistSignalsCookie(bumpSponsorSignalsForPath(prevSig, pathname));
    } catch {
      /* 쿠키 실패 무시 — 배너는 sort_order 폴백 */
    }

    void sendEvents(sid, [{ kind: 'view', route: pathname, ts: now }]);
  }, [pathname]);

  useEffect(() => {
    const sid = getSessionId();
    const onClick = () => {
      clickBufRef.current += 1;
      if (clickBufRef.current >= 24) {
        const n = clickBufRef.current;
        clickBufRef.current = 0;
        void sendEvents(
          sid,
          Array.from({ length: Math.min(n, 32) }, () => ({
            kind: 'click' as const,
            route: pathname,
            ts: Date.now(),
          })),
        );
      }
    };
    document.addEventListener('click', onClick, { capture: true });
    flushClicksRef.current = setInterval(() => {
      if (clickBufRef.current === 0) return;
      const n = clickBufRef.current;
      clickBufRef.current = 0;
      void sendEvents(
        sid,
        Array.from({ length: Math.min(n, 32) }, () => ({
          kind: 'click' as const,
          route: pathname,
          ts: Date.now(),
        })),
      );
    }, 20_000);

    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      if (flushClicksRef.current) clearInterval(flushClicksRef.current);
    };
  }, [pathname]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden' && prevPathRef.current) {
        const sid = getSessionId();
        const routeVis = prevPathRef.current;
        const ms = Date.now() - segmentStartRef.current;
        if (ms >= 800) {
          void sendEvents(sid, [{ kind: 'dwell', route: routeVis, dwell_ms: ms, ts: Date.now() }]);
        }
        try {
          if (ms >= 10_000) {
            const prevSig = readSignalsFromDocument();
            persistSignalsCookie(bumpSponsorSignalsFromDwell(prevSig, routeVis, ms));
          }
        } catch {
          /* noop */
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return null;
}
