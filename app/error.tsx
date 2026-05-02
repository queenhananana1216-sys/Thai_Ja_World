'use client';

/**
 * 세그먼트 렌더링 오류 — 글라스 복구 UI + 옴니 레이더용 UI 인시던트 전송.
 */
import { SystemRecoveringErrorView } from '@/components/system/SystemRecoveringErrorView';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SystemRecoveringErrorView error={error} reset={reset} variant="segment" source="error" />;
}
