/**
 * Tailwind·CSS 청크 실패와 무관하게 보이도록 인라인 스타일만 사용 (첫 페인트 보험)
 */
import { getClientSiteDisplayName } from '@/lib/site-brand/resolveSiteDisplayName';

export default function PortalHomeSuspenseFallback() {
  const brand = getClientSiteDisplayName();
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '48vh',
        padding: 'clamp(1rem, 4vw, 2.5rem)',
        margin: 0,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", sans-serif',
        background: 'linear-gradient(180deg, #0f172a 0%, #0b0f19 55%)',
        color: '#fbbf24',
      }}
    >
      <p
        style={{
          margin: '0 0 0.5rem',
          fontSize: '1rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          color: '#f8fafc',
        }}
      >
        <span style={{ fontSize: '1.85rem', lineHeight: 1 }} aria-hidden>
          🐘
        </span>
        <span
          style={{
            display: 'inline-block',
            borderRadius: '1rem',
            border: '1px solid rgba(251, 191, 36, 0.4)',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.88), rgba(69, 26, 3, 0.35))',
            padding: '0.35rem 0.75rem',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.09), 0 8px 28px rgba(0,0,0,0.35)',
          }}
        >
          <span
            style={{
              background: 'linear-gradient(90deg, #fffbeb, #fcd34d, #fef08a)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              fontWeight: 800,
            }}
          >
            {brand}
          </span>
        </span>
      </p>
      <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500, color: '#cbd5e1', lineHeight: 1.6 }}>
        포털 데이터를 불러오는 중입니다. 이 문구가 계속만 보이면 브라우저 개발자 도구(F12) → Console 탭 오류를 확인해 주세요.
      </p>
      <div
        style={{
          marginTop: '1.25rem',
          height: 4,
          width: 'min(280px, 70vw)',
          borderRadius: 999,
          background: '#1e293b',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '38%',
            borderRadius: 999,
            background: '#fbbf24',
            animation: 'tj-pulse-bar 1.1s ease-in-out infinite',
          }}
        />
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes tj-pulse-bar{0%,100%{opacity:.45}50%{opacity:1}}`,
        }}
      />
    </div>
  );
}
