import Link from 'next/link';

type Props = {
  loginLabel?: string;
  signupLabel?: string;
};

/**
 * 헤더 계정 칩 — 라벨은 i18n dict에서 주입 (기본: 한국어 고정).
 */
export default function AuthBar({ loginLabel = '로그인', signupLabel = '회원가입' }: Props) {
  return (
    <div className="auth-chrome-pills auth-chrome-pills--guest" role="navigation" aria-label="계정">
      <Link
        href="/auth/login?next=%2F"
        className="auth-chrome-pills__pill auth-chrome-pills__pill--primary"
      >
        {loginLabel}
      </Link>
      <Link
        href="/auth/signup?next=%2F"
        className="auth-chrome-pills__pill auth-chrome-pills__pill--ghost"
      >
        {signupLabel}
      </Link>
    </div>
  );
}
