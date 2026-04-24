import Link from 'next/link';

export function CTASection() {
  return (
    <section
      className="relative z-10"
      style={{
        padding: '46px 0 52px',
        background: 'linear-gradient(180deg, #0c0e1c 0%, #090a16 100%)',
        color: '#e2e8f0',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 16px' }}>
        <div
          style={{
            borderRadius: 24,
            border: '1px solid rgba(196,181,253,0.35)',
            background: 'linear-gradient(135deg,rgba(40,20,70,0.78),rgba(95,35,90,0.62))',
            padding: '24px 20px',
            color: '#fff',
            boxShadow: '0 20px 55px rgba(91,33,182,0.26)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 'clamp(23px,4.6vw,40px)', lineHeight: 1.25, fontWeight: 800 }}>
            오늘 처음 태국에 왔다면, 이미 3년 산 사람의 정보가 여기 있습니다.
          </h2>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: '#e9d5ff' }}>
            가입비 없음. 월 구독 없음. 이메일 주소 하나로 30초 안에 핵심 기능을 시작할 수 있습니다.
          </p>
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Link
              href="/auth/signup"
              style={{
                borderRadius: 12,
                background: '#fff',
                padding: '10px 16px',
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#0f172a',
                textDecoration: 'none',
              }}
            >
              지금 무료 가입하기
            </Link>
            <Link
              href="/news"
              style={{
                borderRadius: 12,
                border: '1px solid rgba(237,233,254,0.6)',
                padding: '10px 16px',
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#f5f3ff',
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              게스트로 먼저 구경하기
            </Link>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#e9d5ff' }}>스팸 메일 없음 · 언제든 탈퇴 가능 · 광고 계정 별도 분리</p>
        </div>
      </div>
    </section>
  );
}
