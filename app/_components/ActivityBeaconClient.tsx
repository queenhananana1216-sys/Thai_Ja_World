'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

const DEBOUNCE_MS = 4000;

/**
 * 로그인 세션으로 페이지 경로를 서버에 기록 — 개인화 미션 파이프라인 입력.
 */
export default function ActivityBeaconClient() {
  const pathname = usePathname();
  const search = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<string>('');

  useEffect(() => {
    const path = `${pathname ?? ''}${search?.toString() ? `?${search.toString()}` : ''}`.trim();
    if (!path) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (path === lastSent.current) return;
      void fetch('/api/user-activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path.slice(0, 2048) }),
        keepalive: true,
      })
        .then((r) => {
          if (r.ok) lastSent.current = path;
        })
        .catch(() => {
          /* ignore */
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pathname, search]);

  return null;
}
