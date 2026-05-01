type Props = {
  loginLabel?: string;
  signupLabel?: string;
};

export default function AuthBar({ loginLabel = '로그인', signupLabel = '회원가입' }: Props) {
  return (
    <div className="auth-chrome-pills auth-chrome-pills--guest" role="navigation" aria-label="계정">
      <a href="/auth/login" className="auth-chrome-pills__pill auth-chrome-pills__pill--primary">
        {loginLabel}
      </a>
      <a href="/auth/signup" className="auth-chrome-pills__pill auth-chrome-pills__pill--ghost">
        {signupLabel}
      </a>
    </div>
  );
}
