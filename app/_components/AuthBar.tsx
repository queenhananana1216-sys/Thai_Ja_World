'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type Labels = { login: string; signup: string; logout: string };

export default function AuthBar({ labels }: { labels: Labels }) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const authNext = encodeURIComponent(
    pathname.startsWith('/auth') ? '/' : pathname,
  );
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createBrowserClient();
    const safety = setTimeout(() => setLoading(false), 12_000);
    void sb.auth
      .getSession()
      .then(({ data }) => {
        clearTimeout(safety);
        setEmail(data.session?.user.email ?? null);
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(safety);
        setLoading(false);
      });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => {
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    const sb = createBrowserClient();
    await sb.auth.signOut();
    setEmail(null);
    router.refresh();
  }

  if (loading) {
    return <span className="auth-bar auth-bar--muted">…</span>;
  }

  if (!email) {
    return (
      <div className="auth-bar">
        <Link href={`/auth/login?next=${authNext}`} className="auth-bar__link">
          {labels.login}
        </Link>
        <Link href={`/auth/signup?next=${authNext}`} className="auth-bar__link auth-bar__link--emph">
          {labels.signup}
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-bar">
      <span className="auth-bar__email" title={email}>
        {email.length > 18 ? `${email.slice(0, 16)}…` : email}
      </span>
      <button type="button" className="auth-bar__btn" onClick={() => void logout()}>
        {labels.logout}
      </button>
    </div>
  );
}
