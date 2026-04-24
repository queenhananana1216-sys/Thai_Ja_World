/**
 * app/not-found.tsx — 404 공통 페이지.
 * 서버 컴포넌트로 유지해 정적 렌더 가능.
 */
import Link from 'next/link';

export const dynamic = 'force-static';

export default function NotFound() {
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
          NOT FOUND
        </p>
        <h1 style={{ margin: '14px 0 0', fontSize: 24, fontWeight: 800 }}>
          찾으시는 페이지가 없습니다
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#cbd5e1' }}>
          주소가 바뀌었거나 삭제되었을 수 있어요. 아래 버튼으로 이동해 주세요.
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
