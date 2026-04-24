'use client';

import { useEffect } from 'react';
import { tryCreateBrowserClient } from '@/lib/supabase/client';

const INTERVAL_MS = 120_000;

/**
 * 로그인 시 주기적으로 last_seen_at 갱신 (관리자 접속 추정용).
 * 친구·쪽지 등 메신저 확장은 추후 — 여기서는 지표만.
 */
export default function LastSeenHeartbeat() {
  useEffect(() => {
    let cancelled = false;

    async function touch() {
      if (cancelled || typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;
      const sb = tryCreateBrowserClient();
      if (!sb) return;
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return;
      const { error } = await sb.rpc('touch_profile_last_seen');
      if (error && process.env.NODE_ENV === 'development') {
        console.warn('[LastSeenHeartbeat]', error.message);
      }
    }

    void touch();
    const timer = setInterval(() => void touch(), INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void touch();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return null;
}
