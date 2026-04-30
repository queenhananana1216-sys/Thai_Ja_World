'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Web Vitals / Speed Insights — 메인 페인트 이후 idle(또는 짧은 지연)에만 마운트.
 */
export default function DeferredVercelObservability() {
  const [slot, setSlot] = useState<ReactNode>(null);

  useEffect(() => {
    let cancelled = false;

    const mount = () => {
      if (cancelled) return;
      void Promise.all([import('@vercel/analytics/next'), import('@vercel/speed-insights/next')])
        .then(([{ Analytics }, { SpeedInsights }]) => {
          if (cancelled) return;
          setSlot(
            <>
              <Analytics />
              <SpeedInsights />
            </>,
          );
        })
        .catch(() => {
          /* 위젯 로드 실패는 조용히 무시 — 본문 렌더와 무관 */
        });
    };

    const w = window;
    const id =
      typeof w.requestIdleCallback === 'function'
        ? w.requestIdleCallback(mount, { timeout: 4000 })
        : w.setTimeout(mount, 1200);

    return () => {
      cancelled = true;
      if (typeof w.cancelIdleCallback === 'function' && typeof id === 'number') {
        w.cancelIdleCallback(id);
      } else {
        w.clearTimeout(id as number);
      }
    };
  }, []);

  return slot;
}
