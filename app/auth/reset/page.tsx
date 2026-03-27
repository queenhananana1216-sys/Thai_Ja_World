'use client';

/**
 * Supabase 비밀번호 복구 이메일의 링크가 이 페이지로 옴 (?code= 또는 hash).
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import AuthPageShell from '../_components/AuthPageShell';
import AuthPasswordInput from '../_components/AuthPasswordInput';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { checkPasswordStrength, type PasswordPolicyMessages } from '@/lib/auth/passwordPolicy';
import { createBrowserClient } from '@/lib/supabase/client';

function passwordMsgs(auth: {
  passwordTooShort: string;
  passwordTooLong: string;
  passwordNeedMix: string;
  passwordBanned: string;
}): PasswordPolicyMessages {
  return {
    tooShort: auth.passwordTooShort,
    tooLong: auth.passwordTooLong,
    needLetterDigit: auth.passwordNeedMix,
    banned: auth.passwordBanned,
  };
}

export default function ResetPasswordPage() {
  const { d } = useClientLocaleDictionary();
  const a = d.auth;
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const sb = createBrowserClient();
    void sb.auth.getSession().then(({ data }) => {
      setSessionReady(Boolean(data.session));
    });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const chk = checkPasswordStrength(password, passwordMsgs(a));
    if (!chk.ok) {
      setError(chk.message);
      return;
    }
    setLoading(true);
    const sb = createBrowserClient();
    const { error: err } = await sb.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/auth/login');
    router.refresh();
  }

  if (!sessionReady) {
    return (
      <AuthPageShell
        title={a.resetGateTitle}
        subtitle={
          <>
            {a.resetGateBefore}
            <Link href="/auth/forgot" className="auth-footer-links__a">
              {a.resetGateLink}
            </Link>
            {a.resetGateAfter}
          </>
        }
      >
        <p className="auth-field-hint" style={{ textAlign: 'center' }}>
          {a.resetGateHint}
        </p>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell title={a.newPasswordTitle} subtitle={a.newPasswordSubtitle}>
      <form className="board-form" onSubmit={(e) => void onSubmit(e)}>
        <p className="auth-field-hint">{a.passwordHint}</p>
        <label htmlFor="pw">{a.newPasswordLabel}</label>
        <AuthPasswordInput
          id="pw"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          required
          minLength={8}
          showLabel={a.passwordShow}
          hideLabel={a.passwordHide}
        />
        {error ? <p className="auth-inline-error">{error}</p> : null}
        <button type="submit" className="board-form__submit" disabled={loading}>
          {loading ? a.ellipsis : a.saveAndLogin}
        </button>
      </form>
    </AuthPageShell>
  );
}
