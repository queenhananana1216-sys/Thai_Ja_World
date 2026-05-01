'use client';

/**
 * 전역 블랙박스: 루트 레이아웃까지 터질 때에도 빈 페이지(Blackout) 대신 안전하게 복구 UI를 제공.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0f19',
          color: '#e2e8f0',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", sans-serif',
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 12px', fontSize: '1.25rem', color: '#fbbf24' }}>
            태국에, 살자 — 화면을 불러오지 못했어요
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: '0.875rem', lineHeight: 1.6, color: '#94a3b8' }}>
            일시적인 오류로 화면을 불러오지 못했습니다. 다시 시도하거나 잠시 후 새로고침해 주세요.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '10px 20px',
              borderRadius: 999,
              border: '1px solid rgba(96, 165, 250, 0.5)',
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#dbeafe',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
          {process.env.NODE_ENV === 'development' ? (
            <pre
              style={{
                marginTop: 24,
                textAlign: 'left',
                fontSize: 11,
                color: '#64748b',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              {error?.message}
            </pre>
          ) : null}
        </div>
      </body>
    </html>
  );
}
