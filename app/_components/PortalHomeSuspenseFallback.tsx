/**
 * Tailwind·CSS 청크 실패와 무관하게 보이도록 인라인 스타일만 사용 (첫 페인트 보험)
 */
export default function PortalHomeSuspenseFallback() {
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
      <p style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
        태자<span style={{ color: '#fde68a' }}>월드</span>
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
