'use client';

import { useEffect } from 'react';
import { reportUiIncident } from '@/lib/client/reportUiIncident';
import { SystemRecoveringSurface } from '@/components/system/SystemRecoveringSurface';

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

  return <SystemRecoveringSurface variant={variant} error={error} onRetry={reset} />;
}
