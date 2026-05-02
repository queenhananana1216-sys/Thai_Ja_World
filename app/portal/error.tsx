'use client';

/**
 * 포털(홈 LED 가 있는 구역) 전용 — 상위 error.tsx 와 동일 복구 UX.
 */
import { SystemRecoveringErrorView } from '@/components/system/SystemRecoveringErrorView';

export default function PortalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SystemRecoveringErrorView error={error} reset={reset} variant="segment" source="portal-error" />;
}
