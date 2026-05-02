'use client';

import { useEffect } from 'react';
import { requestMotherbrainHeal } from '@/lib/client/motherbrainHeal';
import { reportUiIncident } from '@/lib/client/reportUiIncident';
import { SystemRecoveringSurface } from '@/components/system/SystemRecoveringSurface';

const MOTHERBRAIN_AUTO_RETRY_MS = 1000;
const MOTHERBRAIN_AUTO_RETRY_MAX = 3;

type Source = 'error' | 'global-error' | 'portal-error' | 'boards-error' | 'community-error';

export function SystemRecoveringErrorView({
  error,
  reset,
  variant,
  source,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  variant: 'global' | 'segment';
  source: Source;
}) {
  useEffect(() => {
    const msg = error?.message != null ? String(error.message) : 'unknown_error';
    console.error(`[SystemRecoveringErrorView:${source}]`, msg, error?.digest ?? '');
    void reportUiIncident({
      source,
      message: msg.slice(0, 2000),
      digest: error?.digest,
    });
  }, [error, source]);

  useEffect(() => {
    let cancelled = false;

    async function motherbrainAutoHealLoop() {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      for (let attempt = 0; attempt < MOTHERBRAIN_AUTO_RETRY_MAX; attempt++) {
        if (cancelled) return;
        if (attempt > 0) {
          await new Promise<void>((r) => setTimeout(r, MOTHERBRAIN_AUTO_RETRY_MS));
        }
        if (cancelled) return;
        await requestMotherbrainHeal(pathname);
        if (cancelled) return;
        try {
          reset();
        } catch {
          /* reset 실패는 무시 — 다음 재시도에서 재힐 */
        }
      }
    }

    void motherbrainAutoHealLoop();
    return () => {
      cancelled = true;
    };
  }, [reset, source]);

  return <SystemRecoveringSurface variant={variant} error={error} onRetry={reset} />;
}
