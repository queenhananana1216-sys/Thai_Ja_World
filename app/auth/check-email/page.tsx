'use client';

/**
 * 이메일 확인(컨펌) 대기 전용 페이지 — 이후 휴대폰 인증 등 단계 UI와 톤을 맞춤.
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import AuthPageShell from '../_components/AuthPageShell';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { PENDING_VERIFICATION_EMAIL_KEY } from '@/lib/auth/pendingVerification';
import { createBrowserClient } from '@/lib/supabase/client';
import { getAuthSiteOrigin } from '@/lib/auth/getAuthSiteOrigin';

function maskEmail(email: string): string {
  const t = email.trim();
  const at = t.indexOf('@');
  if (at < 1) return t;
  const user = t.slice(0, at);
  const domain = t.slice(at + 1);
  const vis = user.length <= 2 ? user[0] + '*' : user.slice(0, 2) + '···';
  return `${vis}@${domain}`;
}

function AuthSuspenseFallback() {
  const { d } = useClientLocaleDictionary();
  return (
    <div className="page-body board-page">
      <p style={{ marginTop: 24 }}>{d.auth.suspenseLoading}</p>
    </div>
  );
}

function CheckEmailInner() {
  const { d } = useClientLocaleDictionary();
  const a = d.auth;
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') ? next : '/';

  const [email, setEmail] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
      if (raw?.trim()) setEmail(raw.trim());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const onResend = useCallback(async () => {
    if (!email?.trim() || cooldown > 0 || resendBusy) return;
    setResendMsg(null);
    setResendErr(null);
    setResendBusy(true);
    const sb = createBrowserClient();
    const origin = getAuthSiteOrigin();
    const { error } = await sb.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    });
    setResendBusy(false);
    if (error) {
      setResendErr(error.message);
      return;
    }
    setResendMsg(d.auth.resendSuccess);
    setCooldown(60);
  }, [email, cooldown, resendBusy, safeNext, d.auth.resendSuccess]);

  return (
    <AuthPageShell
      title={a.checkEmailTitle}
      subtitle={
        <>
          {a.checkEmailSubtitleBefore}
          <strong>{a.checkEmailSubtitleStrong}</strong>
          {a.checkEmailSubtitleAfter}
        </>
      }
    >
      <div className="auth-steps" role="list">
        <div className="auth-step" role="listitem">
          <span className="auth-step__num">1</span>
          <div>
            <p className="auth-step__label">{a.step1Label}</p>
            <p className="auth-step__hint">
              {email ? (
                <>
                  {a.step1HintSentPrefix}
                  <strong className="auth-step__email">{maskEmail(email)}</strong>
                </>
              ) : (
                a.step1HintNoEmail
              )}
            </p>
          </div>
        </div>
        <div className="auth-step" role="listitem">
          <span className="auth-step__num">2</span>
          <div>
            <p className="auth-step__label">{a.step2Label}</p>
            <p className="auth-step__hint">{a.step2Hint}</p>
          </div>
        </div>
        <div className="auth-step" role="listitem">
          <span className="auth-step__num">3</span>
          <div>
            <p className="auth-step__label">{a.step3Label}</p>
            <p className="auth-step__hint">{a.step3Hint}</p>
          </div>
        </div>
      </div>

      <div className="auth-alert auth-alert--muted">
        <p className="auth-alert__title">{a.mailHelpTitle}</p>
        <ul className="auth-alert__list">
          <li>{a.mailHelp1}</li>
          <li>{a.mailHelp2}</li>
          <li>{a.mailHelp3}</li>
        </ul>
      </div>

      {email ? (
        <div className="auth-actions-row">
          <button
            type="button"
            className="board-form__submit auth-btn--secondary"
            disabled={resendBusy || cooldown > 0}
            onClick={() => void onResend()}
          >
            {cooldown > 0
              ? a.resendCooldown.replace('{n}', String(cooldown))
              : resendBusy
                ? a.resendSending
                : a.resendButton}
          </button>
        </div>
      ) : null}

      {resendMsg && <p className="auth-inline-success">{resendMsg}</p>}
      {resendErr && <p className="auth-inline-error">{resendErr}</p>}

      <p className="auth-footer-links">
        <Link href={`/auth/login?next=${encodeURIComponent(safeNext)}`} className="auth-footer-links__a">
          {a.footerVerifiedLogin}
        </Link>
        <span className="auth-footer-links__sep">·</span>
        <Link href={`/auth/signup?next=${encodeURIComponent(safeNext)}`} className="auth-footer-links__a">
          {a.footerOtherEmail}
        </Link>
      </p>
    </AuthPageShell>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <CheckEmailInner />
    </Suspense>
  );
}
