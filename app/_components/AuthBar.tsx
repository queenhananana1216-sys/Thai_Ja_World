'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';

type Labels = { login: string; signup: string; logout: string };

type MemberNavLabels = {
  minihome: string;
  notesInbox: string;
  friends: string;
  ariaLabel: string;
};

export default function AuthBar({
  labels,
  memberNav,
  variant = 'inline',
}: {
  labels: Labels;
  memberNav: MemberNavLabels;
  variant?: 'inline' | 'natePanel';
}) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { locale } = useClientLocaleDictionary();
  const authNext = encodeURIComponent(pathname.startsWith('/auth') ? '/' : pathname);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const displayLocal = useMemo(() => {
    if (!email) return '';
    const local = email.split('@')[0] ?? email;
    return local.length > 14 ? `${local.slice(0, 12)}…` : local;
  }, [email]);

  const greetingSuffix = locale === 'ko' ? '님' : '';

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
    if (variant === 'natePanel') {
      return (
        <div className="nate-user-panel nate-user-panel--loading" aria-busy="true">
          <div className="nate-user-panel__skeleton-line" />
          <div className="nate-user-panel__skeleton-line nate-user-panel__skeleton-line--short" />
        </div>
      );
    }
    return <span className="auth-bar auth-bar--muted">…</span>;
  }

  if (!email) {
    if (variant === 'natePanel') {
      return (
        <div className="nate-user-panel nate-user-panel--guest">
          <div className="nate-user-panel__guest-actions">
            <Link
              href={`/auth/login?next=${authNext}`}
              className="nate-user-panel__btn nate-user-panel__btn--primary"
            >
              {labels.login}
            </Link>
            <Link
              href={`/auth/signup?next=${authNext}`}
              className="nate-user-panel__btn nate-user-panel__btn--outline"
            >
              {labels.signup}
            </Link>
          </div>
        </div>
      );
    }
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

  if (variant === 'natePanel') {
    return (
      <div className="nate-user-panel">
        <div className="nate-user-panel__head">
          <span className="nate-user-panel__name" title={email}>
            <strong>{displayLocal}</strong>
            {greetingSuffix ? <span className="nate-user-panel__suffix">{greetingSuffix}</span> : null}
          </span>
          <button type="button" className="nate-user-panel__logout" onClick={() => void logout()}>
            {labels.logout}
          </button>
        </div>
        <nav className="nate-user-panel__member-quick" aria-label={memberNav.ariaLabel}>
          <Link href="/minihome" className="nate-user-panel__minihome">
            {memberNav.minihome}
          </Link>
          <Link href="/ilchon#ilchon-notes" className="nate-user-panel__subnav-link">
            {memberNav.notesInbox}
          </Link>
          <Link href="/ilchon#ilchon-friends" className="nate-user-panel__subnav-link">
            {memberNav.friends}
          </Link>
        </nav>
      </div>
    );
  }

  return (
    <div className="auth-bar-cluster">
      <Link href="/minihome" className="auth-bar__minihome-btn">
        {memberNav.minihome}
      </Link>
      <nav className="member-quick-nav" aria-label={memberNav.ariaLabel}>
        <Link href="/ilchon#ilchon-notes" className="member-quick-nav__link">
          {memberNav.notesInbox}
        </Link>
        <Link href="/ilchon#ilchon-friends" className="member-quick-nav__link">
          {memberNav.friends}
        </Link>
      </nav>
      <div className="auth-bar">
        <span className="auth-bar__email" title={email}>
          {email.length > 18 ? `${email.slice(0, 16)}…` : email}
        </span>
        <button type="button" className="auth-bar__btn" onClick={() => void logout()}>
          {labels.logout}
        </button>
      </div>
    </div>
  );
}
