'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { readLocaleCookie } from '@/i18n/readLocaleCookie';
import type { UxTrackEvent } from '@/lib/ux/types';

const SESSION_KEY = 'tj_ux_session_id';

function getSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return `fallback_${Date.now()}`;
  }
}

function nowPath(pathname: string, search: URLSearchParams): string {
  const q = search.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export default function GlobalUxTracker() {
  const pathname = usePathname() ?? '/';
  const search = useSearchParams();
  const sessionId = useMemo(getSessionId, []);
  const queueRef = useRef<UxTrackEvent[]>([]);
  const lastClickRef = useRef<{ key: string; ts: number; n: number }>({ key: '', ts: 0, n: 0 });

  function pushEvent(event: Omit<UxTrackEvent, 'session_id' | 'locale'>) {
    const locale = readLocaleCookie();
    queueRef.current.push({
      session_id: sessionId,
      locale,
      ...event,
    });
    if (queueRef.current.length >= 20) {
      void flush(false);
    }
  }

  async function flush(useBeacon: boolean) {
    const batch = queueRef.current.splice(0, queueRef.current.length);
    if (batch.length === 0) return;
    const payload = JSON.stringify({ events: batch });
    if (useBeacon && navigator.sendBeacon) {
      const ok = navigator.sendBeacon('/api/ux/track', new Blob([payload], { type: 'application/json' }));
      if (ok) return;
    }
    try {
      await fetch('/api/ux/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      });
    } catch {
      // telemetry failure should never block UX
    }
  }

  useEffect(() => {
    pushEvent({
      path: nowPath(pathname, search),
      event_type: 'page_view',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const node = target.closest('button, a, [role="button"]') as HTMLElement | null;
      if (!node) return;
      const role = node.tagName.toLowerCase();
      const text = (node.getAttribute('aria-label') || node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
      const path = nowPath(pathname, search);
      pushEvent({
        path,
        event_type: 'click',
        target_role: role,
        target_text: text || undefined,
      });

      const key = `${path}|${role}|${text}`;
      const ts = Date.now();
      const prev = lastClickRef.current;
      const within = ts - prev.ts < 1200;
      if (prev.key === key && within) {
        const nextN = prev.n + 1;
        lastClickRef.current = { key, ts, n: nextN };
        if (nextN >= 3) {
          pushEvent({
            path,
            event_type: 'dead_click',
            target_role: role,
            target_text: text || undefined,
            meta: { burst_count: nextN },
          });
        }
      } else {
        lastClickRef.current = { key, ts, n: 1 };
      }
    };

    const onError = (e: ErrorEvent) => {
      pushEvent({
        path: nowPath(pathname, search),
        event_type: 'js_error',
        target_text: (e.message || 'error').slice(0, 120),
      });
    };

    const onUnhandled = (e: PromiseRejectionEvent) => {
      const reason = typeof e.reason === 'string' ? e.reason : JSON.stringify(e.reason ?? {});
      pushEvent({
        path: nowPath(pathname, search),
        event_type: 'js_error',
        target_text: reason.slice(0, 120),
      });
    };

    const onUnload = () => {
      void flush(true);
    };

    const timer = window.setInterval(() => {
      void flush(false);
    }, 5000);

    document.addEventListener('click', onClick, true);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);
    window.addEventListener('visibilitychange', onUnload);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(timer);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
      window.removeEventListener('visibilitychange', onUnload);
      window.removeEventListener('beforeunload', onUnload);
      void flush(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  return null;
}

