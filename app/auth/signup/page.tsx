'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import AuthPageShell from '../_components/AuthPageShell';
import AuthPasswordInput from '../_components/AuthPasswordInput';
import DailyNewsPushOptIn from '../_components/DailyNewsPushOptIn';
import SocialAuthButtons from '../_components/SocialAuthButtons';
import TurnstileField from '../_components/TurnstileField';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { mapSupabasePasswordPolicyError } from '@/lib/auth/mapSupabasePasswordPolicyError';
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
  passwordNeedLetterDigitSymbol: string;
  passwordBanned: string;
}): PasswordPolicyMessages {
  return {
    tooShort: auth.passwordTooShort,
    tooLong: auth.passwordTooLong,
    needLetterDigitSymbol: auth.passwordNeedLetterDigitSymbol,
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

  const signupSchema = useMemo(
    () =>
      z
        .object({
          email: z.string().trim().min(1, { message: a.emailRequired }).email({ message: a.emailInvalid }),
          displayName: z.string().max(40, { message: a.nickTooLong }),
          password: z.string(),
        })
        .superRefine((data, ctx) => {
          const pw = checkPasswordStrength(data.password, passwordMsgs(a));
          if (!pw.ok) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: pw.message, path: ['password'] });
          }
        }),
    [a],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (authInFlightRef.current) return;
    setError(null);

    if (hp.trim() !== '') {
      setError(a.honeypotSignup);
      return;
    }

    const parsed = signupSchema.safeParse({ email, password, displayName });
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg =
        first.email?.[0] ??
        first.displayName?.[0] ??
        first.password?.[0] ??
        parsed.error.issues[0]?.message ??
        a.emailInvalid;
      setError(msg);
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

    const { email: em, password: pw, displayName: nick } = parsed.data;

    authInFlightRef.current = true;
    setLoading(true);
    try {
      const sb = createBrowserClient();
      const origin = getAuthSiteOrigin();
      const captchaOpts = supabaseAuthCaptchaOptions(HAS_TURNSTILE_UI, turnstileTokenRef.current);
      const { data, error: err } = await sb.auth.signUp({
        email: em,
        password: pw,
        options: {
          data: { display_name: nick.trim() || em.split('@')[0] },
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
        const friendly = mapSupabasePasswordPolicyError(message, a.passwordNeedLetterDigitSymbol);
        setError(friendly);
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
        sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, em);
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
