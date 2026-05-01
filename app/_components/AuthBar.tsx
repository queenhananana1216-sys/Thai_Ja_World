import Link from 'next/link';

/**
 * 비상 정적 헤더 전용 — Supabase·세션·훅 없음. 항상 로그인 / 회원가입만 표시.
 */
export default function AuthBar() {
  return (
    <div className="auth-chrome-pills auth-chrome-pills--guest" role="navigation" aria-label="계정">
      <Link
        href="/auth/login?next=%2F"
        className="auth-chrome-pills__pill auth-chrome-pills__pill--primary"
      >
        로그인
      </Link>
      <Link
        href="/auth/signup?next=%2F"
        className="auth-chrome-pills__pill auth-chrome-pills__pill--ghost"
      >
        회원가입
      </Link>
    </div>
  );
}
