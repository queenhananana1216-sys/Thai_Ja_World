'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, type FormEvent } from 'react';
import AuthPageShell from '../_components/AuthPageShell';
import DailyNewsPushOptIn from '../_components/DailyNewsPushOptIn';
import SocialAuthButtons from '../_components/SocialAuthButtons';
import TurnstileField from '../_components/TurnstileField';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { supabaseAuthCaptchaOptions, verifyTurnstileOnSubmit } from '@/lib/auth/verifyTurnstileClient';
import { createBrowserClient } from '@/lib/supabase/client';
import { getTurnstileErrorHint } from '@/lib/auth/getTurnstileErrorHint';

const HAS_TURNSTILE_UI = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());

function AuthSuspenseFallback() {
  const { d } = useClientLocaleDictionary();
  return (
    <div className="auth-shell">
      <p style={{ textAlign: 'center', marginTop: 24 }}>{d.auth.suspenseLoading}</p>
    </div>
  );
}

function LoginForm() {
  const { d } = useClientLocaleDictionary();
  const a = d.auth;
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') ? next : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hp, setHp] = useState('');
  const turnstileTokenRef = useRef<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (hp.trim() !== '') {
      setError(a.honeypotLogin);
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

    setLoading(true);
    const sb = createBrowserClient();
    const captchaOpts = supabaseAuthCaptchaOptions(HAS_TURNSTILE_UI, turnstileTokenRef.current);
    const { error: err } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
      ...(captchaOpts ? { options: captchaOpts } : {}),
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(safeNext);
    router.refresh();
  }

  return (
    <AuthPageShell title={a.loginTitle} subtitle={a.loginSubtitle}>
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
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <TurnstileField tokenRef={turnstileTokenRef} loadingLabel={a.turnstileLoading} />
        {error ? <p className="auth-inline-error">{error}</p> : null}
        <button type="submit" className="board-form__submit" disabled={loading}>
          {loading ? a.ellipsis : a.submitLogin}
        </button>
      </form>

      <p className="auth-footer-links" style={{ marginTop: 14, textAlign: 'left' }}>
        <Link href={`/auth/forgot?next=${encodeURIComponent(safeNext)}`} className="auth-footer-links__a">
          {a.forgotPassword}
        </Link>
        <span style={{ margin: '0 0.5em', opacity: 0.4 }}>|</span>
        <Link href={`/auth/phone?next=${encodeURIComponent(safeNext)}`} className="auth-footer-links__a">
          {a.loginPhoneLink}
        </Link>
      </p>

      <div className="auth-divider">
        <span>{a.or}</span>
      </div>

      <SocialAuthButtons next={safeNext} social={a} />

      <DailyNewsPushOptIn />

      <p className="auth-footer-links" style={{ marginTop: 22 }}>
        {a.noAccount}{' '}
        <Link href={`/auth/signup?next=${encodeURIComponent(safeNext)}`} className="auth-footer-links__a">
          {a.signupLink}
        </Link>
      </p>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <LoginForm />
    </Suspense>
  );
}
