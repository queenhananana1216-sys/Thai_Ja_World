'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, type FormEvent } from 'react';
import AuthPageShell from '../_components/AuthPageShell';
import AuthPasswordInput from '../_components/AuthPasswordInput';
import DailyNewsPushOptIn from '../_components/DailyNewsPushOptIn';
import SocialAuthButtons from '../_components/SocialAuthButtons';
import TurnstileField from '../_components/TurnstileField';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { checkPasswordStrength, type PasswordPolicyMessages } from '@/lib/auth/passwordPolicy';
import { PENDING_VERIFICATION_EMAIL_KEY } from '@/lib/auth/pendingVerification';
import { supabaseAuthCaptchaOptions, verifyTurnstileOnSubmit } from '@/lib/auth/verifyTurnstileClient';
import { createBrowserClient } from '@/lib/supabase/client';
import { getAuthSiteOrigin } from '@/lib/auth/getAuthSiteOrigin';
import { getTurnstileErrorHint, userFacingCaptchaAuthError } from '@/lib/auth/getTurnstileErrorHint';

const HAS_TURNSTILE_UI = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());

function AuthSuspenseFallback() {
  const { d } = useClientLocaleDictionary();
  return (
    <div className="auth-shell">
      <p style={{ textAlign: 'center', marginTop: 24 }}>{d.auth.suspenseLoading}</p>
    </div>
  );
}

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

function SignupForm() {
  const { d } = useClientLocaleDictionary();
  const a = d.auth;
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') ? next : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hp, setHp] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const turnstileTokenRef = useRef<string | null>(null);
  const authInFlightRef = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (authInFlightRef.current) return;
    setError(null);

    if (hp.trim() !== '') {
      setError(a.honeypotSignup);
      return;
    }

    const pw = checkPasswordStrength(password, passwordMsgs(a));
    if (!pw.ok) {
      setError(pw.message);
      return;
    }

    const captcha = await verifyTurnstileOnSubmit(HAS_TURNSTILE_UI, turnstileTokenRef.current);
    if (!captcha.ok) {
      if (captcha.reason === 'missing_token') {
        setError(a.turnstileIncomplete);
        return;
      }

      const hint = getTurnstileErrorHint(captcha.codes);
      setError(hint ? `${a.turnstileVerifyFailed} ${hint}` : a.turnstileVerifyFailed);
      return;
    }

    authInFlightRef.current = true;
    setLoading(true);
    try {
      const sb = createBrowserClient();
      const origin = getAuthSiteOrigin();
      const captchaOpts = supabaseAuthCaptchaOptions(HAS_TURNSTILE_UI, turnstileTokenRef.current);
      const { data, error: err } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() || email.split('@')[0] },
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
          ...captchaOpts,
        },
      });
      if (err) {
        const { message, remountTurnstile } = userFacingCaptchaAuthError(err.message, a.turnstileVerifyFailed);
        if (remountTurnstile) {
          turnstileTokenRef.current = null;
          setTurnstileKey((k) => k + 1);
        }
        setError(message);
        return;
      }
      if (data.session) {
        try {
          sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
        } catch {
          /* ignore */
        }
        router.push(safeNext);
        router.refresh();
        return;
      }
      try {
        sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email.trim());
      } catch {
        /* ignore */
      }
      router.push(`/auth/check-email?next=${encodeURIComponent(safeNext)}`);
    } finally {
      authInFlightRef.current = false;
      setLoading(false);
    }
  }

  return (
    <AuthPageShell title={a.signupTitle} subtitle={a.signupSubtitle}>
      <form className="board-form" onSubmit={(e) => void onSubmit(e)}>
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          style={{
            position: 'absolute',
            left: '-9999px',
            width: 1,
            height: 1,
            opacity: 0,
          }}
          aria-hidden
        />
        <label htmlFor="nick">{a.nickLabel}</label>
        <input
          id="nick"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={a.nickPlaceholder}
          maxLength={40}
          autoComplete="nickname"
        />
        <label htmlFor="email">{a.email}</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">{a.password}</label>
        <AuthPasswordInput
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          required
          minLength={8}
          showLabel={a.passwordShow}
          hideLabel={a.passwordHide}
        />
        <p className="auth-field-hint">{a.passwordHint}</p>
        <TurnstileField key={turnstileKey} tokenRef={turnstileTokenRef} loadingLabel={a.turnstileLoading} />
        {error ? <p className="auth-inline-error">{error}</p> : null}
        <button type="submit" className="board-form__submit" disabled={loading}>
          {loading ? a.signupSubmitLoading : a.signupSubmit}
        </button>
      </form>

      <div className="auth-divider">
        <span>{a.or}</span>
      </div>

      <SocialAuthButtons next={safeNext} social={a} />

      <DailyNewsPushOptIn />

      <p className="auth-footer-links" style={{ marginTop: 22 }}>
        <Link href={`/auth/phone?next=${encodeURIComponent(safeNext)}`} className="auth-footer-links__a">
          {a.signupPhoneLink}
        </Link>
        <span style={{ margin: '0 0.35em', opacity: 0.5 }}>·</span>
        {a.hasAccount}{' '}
        <Link href={`/auth/login?next=${encodeURIComponent(safeNext)}`} className="auth-footer-links__a">
          {a.loginLink}
        </Link>
      </p>
    </AuthPageShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <SignupForm />
    </Suspense>
  );
}
