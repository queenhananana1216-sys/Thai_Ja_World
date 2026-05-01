export default function AuthBar() {
  return (
    <div className="auth-chrome-pills auth-chrome-pills--guest" role="navigation" aria-label="계정">
      <a href="/auth/login" className="auth-chrome-pills__pill auth-chrome-pills__pill--primary">
        로그인
      </a>
      <a href="/auth/signup" className="auth-chrome-pills__pill auth-chrome-pills__pill--ghost">
        회원가입
      </a>
    </div>
  );
}
