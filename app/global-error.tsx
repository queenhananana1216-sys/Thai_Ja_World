'use client';

/**
 * 전역 블랙박스: 루트 레이아웃까지 터질 때 글라스모피즘 복구 UI + UI 인시던트 리포트.
 */
import { SystemRecoveringErrorView } from '@/components/system/SystemRecoveringErrorView';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0 }}>
        <SystemRecoveringErrorView error={error} reset={reset} variant="global" source="global-error" />
      </body>
    </html>
  );
}
