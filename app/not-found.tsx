'use client';

/**
 * 404 — 자가 치유 레이더: 잘못된 경로에서 UUID 기준으로 실제 상세 URL 탐색 후 리다이렉트
 */
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type RadarPhase = 'scanning' | 'redirecting' | 'processing' | 'idle';

export default function NotFound() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [phase, setPhase] = useState<RadarPhase>('scanning');
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function radar() {
      if (!pathname?.trim()) {
        setPhase('idle');
        return;
      }
      setPhase('scanning');
      try {
        const res = await fetch(`/api/public/radar-resolve?path=${encodeURIComponent(pathname)}`, {
          cache: 'no-store',
        });
        const data = (await res.json()) as {
          status?: string;
          to?: string;
          message?: string;
        };
        if (cancelled) return;
        if (data.status === 'redirect' && data.to?.trim()) {
          setPhase('redirecting');
          router.replace(data.to.trim());
          return;
        }
        if (data.status === 'processing') {
          setProcessingMessage(
            data.message?.trim() ||
              'AI가 기사를 한국어로 가공하고 있습니다. 잠시만 기다려주세요.',
          );
          setPhase('processing');
          return;
        }
      } catch {
        if (!cancelled) setPhase('idle');
        return;
      }
      setPhase('idle');
    }

    void radar();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (phase === 'processing' && processingMessage) {
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
      >
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            borderRadius: 20,
            border: '1px solid rgba(196,181,253,0.35)',
            background: 'rgba(15,17,40,0.92)',
            padding: '32px 26px',
            textAlign: 'center',
          }}
        >
          <div
            className="radar-pulse"
            style={{
              margin: '0 auto 18px',
              width: 52,
              height: 52,
              borderRadius: '50%',
              border: '3px solid rgba(196,181,253,0.45)',
              borderTopColor: '#c4b5fd',
              animation: 'tj-radar-spin 0.9s linear infinite',
            }}
          />
          <style>{`@keyframes tj-radar-spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#e2e8f0' }}>{processingMessage}</p>
          <p style={{ margin: '14px 0 0', fontSize: 12, color: '#94a3b8' }}>
            새로고침하면 준비된 페이지로 이동할 수 있어요.
          </p>
          <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => router.refresh()}
              style={{
                minHeight: 42,
                padding: '10px 18px',
                borderRadius: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                color: '#0f172a',
                background: 'linear-gradient(120deg,#c4b5fd,#f9a8d4)',
              }}
            >
              새로고침
            </button>
            <Link
              href="/"
              style={{
                minHeight: 42,
                display: 'inline-flex',
                alignItems: 'center',
                padding: '10px 18px',
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

  const showRadarHint = phase === 'scanning' || phase === 'redirecting';

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
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(15,17,40,0.85)',
          padding: '28px 24px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            display: 'inline-flex',
            padding: '4px 10px',
            borderRadius: 999,
            border: '1px solid rgba(196,181,253,0.45)',
            color: '#ddd6fe',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
          }}
        >
          {showRadarHint ? 'RADAR · 탐색 중' : 'NOT FOUND'}
        </p>
        <h1 style={{ margin: '14px 0 0', fontSize: 24, fontWeight: 800 }}>
          {showRadarHint ? '주소를 바로잡는 중이에요…' : '찾으시는 페이지가 없습니다'}
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#cbd5e1' }}>
          {showRadarHint
            ? '잘못된 링크라면 자동으로 옮겨 드려요. 잠시만 기다려 주세요.'
            : '주소가 바뀌었거나 삭제되었을 수 있어요. 아래 버튼으로 이동해 주세요.'}
        </p>
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '10px 16px',
              borderRadius: 12,
              fontWeight: 700,
              color: '#0f172a',
              textDecoration: 'none',
              background: 'linear-gradient(120deg,#c4b5fd,#f9a8d4)',
              boxShadow: '0 10px 28px rgba(196,181,253,0.35)',
            }}
          >
            홈으로
          </Link>
          <Link
            href="/boards"
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
            통합 게시판
          </Link>
          <Link
            href="/tips"
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
            꿀팁 허브
          </Link>
        </div>
      </div>
    </main>
  );
}
