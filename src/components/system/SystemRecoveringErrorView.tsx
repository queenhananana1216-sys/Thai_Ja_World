'use client';

import { useEffect } from 'react';
import { requestMotherbrainHeal } from '@/lib/client/motherbrainHeal';
import { reportUiIncident } from '@/lib/client/reportUiIncident';
import { SystemRecoveringSurface } from '@/components/system/SystemRecoveringSurface';

const MOTHERBRAIN_AUTO_RETRY_MS = 1000;
const MOTHERBRAIN_AUTO_RETRY_MAX = 3;

type Source =
  | 'error'
  | 'global-error'
  | 'portal-error'
  | 'boards-error'
  | 'community-error'
  | 'local-minihome-error';

export function SystemRecoveringErrorView({
  error,
  reset,
  variant,
  source,
  healInitialDelayMs = 0,
  healRetryDelayMs,
  healRetryMax,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  variant: 'global' | 'segment';
  source: Source;
  /** 첫 motherbrain 힐·reset 전 대기(ms) — 로컬 미니홈 등 ‘조용한’ 재시도용 */
  healInitialDelayMs?: number;
  healRetryDelayMs?: number;
  healRetryMax?: number;
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
      const delayMs = healRetryDelayMs ?? MOTHERBRAIN_AUTO_RETRY_MS;
      const max = healRetryMax ?? MOTHERBRAIN_AUTO_RETRY_MAX;
      for (let attempt = 0; attempt < max; attempt++) {
        if (cancelled) return;
        const wait =
          attempt === 0 ? Math.max(0, healInitialDelayMs) : Math.max(0, delayMs);
        if (wait > 0) {
          await new Promise<void>((r) => setTimeout(r, wait));
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
  }, [healInitialDelayMs, healRetryDelayMs, healRetryMax, reset, source]);

  return <SystemRecoveringSurface variant={variant} error={error} onRetry={reset} />;
}
