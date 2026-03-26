'use client';

/**
 * Supabase Phone OTP — 문자로 번호 확인 후 가입 또는 로그인 (통신사 본인인증 아님).
 * 대시보드: Authentication → Providers → Phone 활성화 + SMS 제공업체(Twilio 등) 연결 필요.
 */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, type FormEvent } from 'react';
import AuthPageShell from '../_components/AuthPageShell';
import TurnstileField from '../_components/TurnstileField';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { normalizePhoneToE164 } from '@/lib/auth/normalizePhoneE164';
import { verifyTurnstileOnSubmit } from '@/lib/auth/verifyTurnstileClient';
import { tryCreateBrowserClient } from '@/lib/supabase/client';
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

function PhoneAuthForm() {
  const { d } = useClientLocaleDictionary();
  const a = d.auth;
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') ? next : '/';

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [e164, setE164] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hp, setHp] = useState('');
  const turnstileTokenRef = useRef<string | null>(null);

  async function sendSms(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (hp.trim() !== '') {
      setError(a.honeypotSignup);
      return;
    }

    const normalized = normalizePhoneToE164(phoneRaw);
    if (!normalized.ok) {
      setError(
        normalized.reason === 'empty' ? a.phoneAuthInvalidPhone : a.phoneAuthInvalidPhone,
      );
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

    const sb = tryCreateBrowserClient();
    if (!sb) {
      setError(a.phoneAuthNoSupabase);
      return;
    }

    setLoading(true);
    const { error: err } = await sb.auth.signInWithOtp({
      phone: normalized.e164,
      options: {
        shouldCreateUser: true,
        data: {
          display_name: displayName.trim() || undefined,
        },
      },
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }
    setE164(normalized.e164);
    setStep('otp');
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const code = otp.replace(/\D/g, '');
    if (code.length < 6) {
      setError(a.phoneAuthOtpHint);
      return;
    }

    const sb = tryCreateBrowserClient();
    if (!sb) {
      setError(a.phoneAuthNoSupabase);
      return;
    }

    setLoading(true);
    const { error: err } = await sb.auth.verifyOtp({
      phone: e164,
      token: code,
      type: 'sms',
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }
    router.push(safeNext);
    router.refresh();
  }

  async function resendSms() {
    setError(null);
    const sb = tryCreateBrowserClient();
    if (!sb) {
      setError(a.phoneAuthNoSupabase);
      return;
    }
    setLoading(true);
    const { error: err } = await sb.auth.signInWithOtp({
      phone: e164,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (err) setError(err.message);
  }

  return (
    <AuthPageShell title={a.phoneAuthTitle} subtitle={a.phoneAuthSubtitle}>
      {step === 'phone' ? (
        <form className="board-form" onSubmit={(e) => void sendSms(e)}>
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
          <label htmlFor="phone-auth-nick">{a.nickLabel}</label>
          <input
            id="phone-auth-nick"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={a.nickPlaceholder}
            maxLength={40}
            autoComplete="nickname"
          />
          <p className="auth-field-hint">{a.phoneAuthNickOptional}</p>
          <label htmlFor="phone-auth-tel">{a.phoneAuthPhoneLabel}</label>
          <input
            id="phone-auth-tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phoneRaw}
            onChange={(e) => setPhoneRaw(e.target.value)}
            placeholder={a.phoneAuthPhonePlaceholder}
            required
          />
          <p className="auth-field-hint">{a.phoneAuthPhoneHint}</p>
          <TurnstileField tokenRef={turnstileTokenRef} loadingLabel={a.turnstileLoading} />
          {error ? <p className="auth-inline-error">{error}</p> : null}
          <button type="submit" className="board-form__submit" disabled={loading}>
            {loading ? a.phoneAuthSendSmsLoading : a.phoneAuthSendSms}
          </button>
        </form>
      ) : (
        <form className="board-form" onSubmit={(e) => void verifyCode(e)}>
          <p className="auth-field-hint">
            {a.phoneAuthOtpSentPrefix}
            <strong>{e164}</strong>
            {a.phoneAuthOtpSentSuffix}
          </p>
          <label htmlFor="phone-auth-otp">{a.phoneAuthOtpLabel}</label>
          <input
            id="phone-auth-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="123456"
            required
          />
          <p className="auth-field-hint">{a.phoneAuthOtpHint}</p>
          {error ? <p className="auth-inline-error">{error}</p> : null}
          <button type="submit" className="board-form__submit" disabled={loading}>
            {loading ? a.phoneAuthVerifyLoading : a.phoneAuthVerify}
          </button>
          <button
            type="button"
            className="board-form__submit"
            style={{ marginTop: 8, background: 'transparent', border: '1px solid var(--tj-border, #ccc)' }}
            disabled={loading}
            onClick={() => void resendSms()}
          >
            {a.phoneAuthResendSms}
          </button>
          <button
            type="button"
            className="board-form__submit"
            style={{ marginTop: 8, background: 'transparent', border: '1px solid var(--tj-border, #ccc)' }}
            disabled={loading}
            onClick={() => {
              setStep('phone');
              setOtp('');
              setError(null);
            }}
          >
            {a.phoneAuthChangeNumber}
          </button>
        </form>
      )}

      <p className="auth-footer-links" style={{ marginTop: 22 }}>
        <Link href={`/auth/signup?next=${encodeURIComponent(safeNext)}`} className="auth-footer-links__a">
          {a.phoneAuthFooterEmailSignup}
        </Link>
        {' · '}
        <Link href={`/auth/login?next=${encodeURIComponent(safeNext)}`} className="auth-footer-links__a">
          {a.loginLink}
        </Link>
      </p>
    </AuthPageShell>
  );
}

export default function PhoneAuthPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <PhoneAuthForm />
    </Suspense>
  );
}
