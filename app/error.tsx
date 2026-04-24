'use client';

/**
 * app/error.tsx — Route-segment Error Boundary
 *
 * 루트 레이아웃은 살아 있고, 하위 page.tsx / layout.tsx 에서 서버 예외가 났을 때
 * Next.js 가 여기를 렌더합니다. 기존에는 이 파일이 없어서 사용자는
 * "Application error: a server-side exception has occurred ... Digest: xxx"
 * 라는 Next.js 기본 화면만 보게 돼 2일째 방치된 원인이 되었습니다.
 *
 * - Supabase / ENV 없이도 렌더되도록 순수 HTML/CSS in-JSX 로만 구성합니다.
 * - digest 와 `data-tj-deploy-sha` 를 함께 보여줘 Vercel 로그·배포와 곧바로 교차 확인 가능.
 */
import { useEffect } from 'react';
import Link from 'next/link';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const digest = error?.digest ?? 'no-digest';
    const message = error?.message ?? 'unknown';
    // 클라이언트 콘솔엔 표시해 브라우저 DevTools 에서도 추적 가능.
    console.error('[taeja.error] server component threw', { digest, message });
  }, [error]);

  const digest = error?.digest ?? 'no-digest';
  const deploySha =
    typeof document !== 'undefined'
      ? document.body?.getAttribute('data-tj-deploy-sha') ?? ''
      : '';

  return (
    <main
      style={{
        minHeight: '60vh',
        padding: '40px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg,#0a0b1f 0%,#11112e 100%)',
        color: '#f8fafc',
      }}
      role="alert"
    >
      <div
        style={{
          maxWidth: 560,
          width: '100%',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(15,17,40,0.85)',
          padding: '28px 24px',
          boxShadow: '0 24px 80px rgba(2,6,23,0.55)',
        }}
      >
        <p
          style={{
            margin: 0,
            display: 'inline-flex',
            padding: '4px 10px',
            borderRadius: 999,
            border: '1px solid rgba(244,114,182,0.45)',
            color: '#fbcfe8',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
          }}
        >
          SERVER ERROR
        </p>
        <h1 style={{ margin: '14px 0 0', fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>
          일시적으로 페이지를 불러오지 못했습니다
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#cbd5e1' }}>
          잠시 후 다시 시도해 주세요. 문제가 계속되면 아래 오류 코드와 함께 문의해 주세요.
        </p>
        <dl
          style={{
            margin: '18px 0 0',
            padding: 12,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            fontSize: 12,
            color: '#e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '4px 10px',
          }}
        >
          <dt style={{ opacity: 0.7 }}>오류 코드</dt>
          <dd style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
            {digest}
          </dd>
          {deploySha ? (
            <>
              <dt style={{ opacity: 0.7 }}>배포 SHA</dt>
              <dd style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                {deploySha.slice(0, 8)}
              </dd>
            </>
          ) : null}
        </dl>
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
          <Link
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
          </Link>
        </div>
      </div>
    </main>
  );
}
