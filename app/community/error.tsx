'use client';

import { SystemRecoveringErrorView } from '@/components/system/SystemRecoveringErrorView';

export default function CommunitySegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SystemRecoveringErrorView error={error} reset={reset} variant="segment" source="community-error" />
  );
}
