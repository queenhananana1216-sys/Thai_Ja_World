'use client';

/**
 * 광고주 디지털 메뉴판 세그먼트 — motherbrain 힐 + 0.5초 간격 재시도(조용한 복구).
 */
import { SystemRecoveringErrorView } from '@/components/system/SystemRecoveringErrorView';

export default function LocalMinihomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SystemRecoveringErrorView
      error={error}
      reset={reset}
      variant="segment"
      source="local-minihome-error"
      healInitialDelayMs={500}
      healRetryDelayMs={500}
      healRetryMax={8}
    />
  );
}
