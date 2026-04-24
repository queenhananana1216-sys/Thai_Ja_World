import Link from 'next/link';
import { portWidgetCard, portPrimaryBtn, portSecondaryBtn } from '@/lib/landing/portalWidgetStyle';

type Props = { variant?: 'legacy' | 'portal' };

export function CTASection({ variant = 'legacy' }: Props) {
  if (variant === 'portal') {
    return (
      <section className="border-t border-slate-200/80 bg-slate-100/50 py-8" data-variant="cta-portal">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className={portWidgetCard + ' border-violet-200/90 bg-violet-50/40 p-5 sm:p-6'}>
            <h2 className="m-0 text-balance text-lg font-extrabold leading-snug text-slate-900 sm:text-xl">
              오늘 처음 태국에 왔다면, 이미 3년 산 사람의 정보가 여기 있습니다.
            </h2>
            <p className="mt-2.5 m-0 text-sm leading-relaxed text-slate-600">
              가입비 없음. 월 구독 없음. 이메일 주소 하나로 30초 안에 핵심 기능을 시작할 수 있습니다.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href="/auth/signup" className={portPrimaryBtn + ' min-h-10 text-[0.8125rem]'}>
                지금 무료 가입하기
              </Link>
              <Link href="/news" className={portSecondaryBtn + ' min-h-10 text-[0.8125rem]'}>
                게스트로 먼저 구경하기
              </Link>
            </div>
            <p className="mt-2.5 m-0 text-xs text-slate-500">스팸 메일 없음 · 언제든 탈퇴 가능 · 광고 계정 별도 분리</p>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section
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
