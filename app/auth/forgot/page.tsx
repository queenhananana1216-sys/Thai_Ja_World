'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import AuthPageShell from '../_components/AuthPageShell';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const { d } = useClientLocaleDictionary();
  const a = d.auth;
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const sb = createBrowserClient();
    const origin = window.location.origin;
    const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/reset`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setInfo(a.forgotInfoSent);
  }

  return (
    <AuthPageShell title={a.forgotTitle} subtitle={a.forgotSubtitle}>
      <form className="board-form" onSubmit={(e) => void onSubmit(e)}>
        <label htmlFor="email">{a.email}</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error ? <p className="auth-inline-error">{error}</p> : null}
        {info ? <p className="auth-inline-success">{info}</p> : null}
        <button type="submit" className="board-form__submit" disabled={loading}>
          {loading ? a.ellipsis : a.forgotSendLink}
        </button>
      </form>
      <p className="auth-footer-links" style={{ marginTop: 20 }}>
        <Link href="/auth/login" className="auth-footer-links__a">
          {a.forgotBackLogin}
        </Link>
      </p>
    </AuthPageShell>
  );
}
