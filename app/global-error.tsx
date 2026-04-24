'use client';

/**
 * app/global-error.tsx — 루트 레이아웃 자체가 throw 한 경우의 마지막 보루.
 * Next.js 요구사항: 반드시 <html> / <body> 를 직접 렌더해야 함.
 * 여기서도 Supabase / dictionaries 에 의존하면 다시 터지므로 HTML/CSS 로만 구성.
 */
type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  const digest = error?.digest ?? 'no-digest';
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#090a1c',
          color: '#f8fafc',
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', 'Noto Sans KR', 'Noto Sans Thai', Arial, sans-serif",
        }}
      >
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
          }}
          role="alert"
        >
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(16,18,44,0.9)',
              padding: '28px 24px',
              boxShadow: '0 24px 80px rgba(2,6,23,0.65)',
            }}
          >
            <p
              style={{
                margin: 0,
                display: 'inline-flex',
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid rgba(248,113,113,0.5)',
                color: '#fecaca',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              SITE OUTAGE
            </p>
            <h1 style={{ margin: '14px 0 0', fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>
              태자월드가 일시적으로 응답하지 못했습니다
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#cbd5e1' }}>
              자동 복구 스크립트가 바로 알림을 받고 있으니 잠시 후 다시 시도해 주세요.
            </p>
            <p
              style={{
                margin: '18px 0 0',
                padding: 10,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                fontSize: 12,
                color: '#e2e8f0',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              오류 코드: {digest}
            </p>
            <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  minHeight: 44,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  color: '#0f172a',
                  background: 'linear-gradient(120deg,#c4b5fd,#f9a8d4)',
                  boxShadow: '0 10px 28px rgba(196,181,253,0.35)',
                }}
              >
                다시 시도
              </button>
              {/* global-error.tsx 는 루트 레이아웃 바깥이라 next/link 의존성을 배제 — 순수 anchor 가 안전 */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontWeight: 600,
                  color: '#f1f5f9',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.22)',
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                홈으로
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
