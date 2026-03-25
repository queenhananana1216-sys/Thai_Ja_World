'use client';

/**
 * 이메일 인증 링크 / OAuth 이후 세션 확립.
 * Supabase → Authentication → URL Configuration 에
 * Site URL 및 Redirect URLs 에 /auth/callback 포함.
 */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import AuthPageShell from '../_components/AuthPageShell';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';

function AuthSuspenseFallback() {
  const { d } = useClientLocaleDictionary();
  return (
    <div className="auth-shell">
      <p style={{ textAlign: 'center', marginTop: 24 }}>{d.auth.suspenseLoading}</p>
    </div>
  );
}

type Phase = 'loading' | 'ok' | 'fail';

function CallbackInner() {
  const { d } = useClientLocaleDictionary();
  const a = d.auth;
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') ? next : '/';
  const [phase, setPhase] = useState<Phase>('loading');
  const [failDetail, setFailDetail] = useState<string | null>(null);

  useEffect(() => {
    const sb = createBrowserClient();
    void (async () => {
      const { data, error } = await sb.auth.getSession();
      if (error) {
        setFailDetail(error.message);
        setPhase('fail');
        return;
      }
      if (data.session) {
        setPhase('ok');
        router.replace(safeNext);
        router.refresh();
        return;
      }
      setFailDetail(null);
      setPhase('fail');
    })();
  }, [router, safeNext]);

  const subtitle =
    phase === 'loading'
      ? a.callbackConnecting
      : phase === 'ok'
        ? a.callbackDone
        : (failDetail ?? a.callbackSessionFail);

  return (
    <AuthPageShell
      title={phase === 'ok' ? a.callbackTitleOk : a.callbackTitleWait}
      subtitle={subtitle}
    >
      {phase === 'fail' && (
        <p className="auth-footer-links" style={{ marginTop: 8 }}>
          <Link href="/auth/login" className="auth-footer-links__a">
            {a.callbackToLogin}
          </Link>
          <span className="auth-footer-links__sep">·</span>
          <Link href="/auth/check-email" className="auth-footer-links__a">
            {a.callbackToCheckEmail}
          </Link>
        </p>
      )}
    </AuthPageShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <CallbackInner />
    </Suspense>
  );
}
