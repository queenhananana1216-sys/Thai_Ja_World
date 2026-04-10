import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, isAdminCookieValid } from '@/lib/adminAuth';
import { loginAction } from './actions';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const jar = await cookies();
  if (isAdminCookieValid(jar.get(ADMIN_COOKIE_NAME)?.value)) {
    redirect('/admin');
  }

  const err =
    sp.error === 'auth'
      ? '시크릿이 올바르지 않습니다.'
      : sp.error === 'config'
        ? '서버에 AUTO_ADMIN_SECRET 이 설정되어 있지 않습니다.'
        : null;

  return (
    <main className="panel" style={{ maxWidth: 420 }}>
      <h1>관리자 로그인</h1>
      {err && (
        <p style={{ color: 'var(--danger)' }} role="alert">
          {err}
        </p>
      )}
      <p className="muted">환경 변수 AUTO_ADMIN_SECRET 과 동일한 값을 입력하세요.</p>
      <form action={loginAction}>
        <label>
          Secret
          <input type="password" name="secret" required autoComplete="off" style={{ width: '100%' }} />
        </label>
        <div style={{ marginTop: '0.75rem' }}>
          <button type="submit">로그인</button>
        </div>
      </form>
    </main>
  );
}
