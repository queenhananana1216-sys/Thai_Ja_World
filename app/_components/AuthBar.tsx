'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { tryCreateBrowserClient } from '@/lib/supabase/client';

type Labels = { login: string; signup: string; logout: string };

type MemberNavLabels = {
  minihome: string;
  notesInbox: string;
  friends: string;
  ariaLabel: string;
};

/**
 * 글로벌 스티키 헤더용 초소형 인증 UI (Pill).
 * Supabase env 가 없으면 세션 없음으로만 처리 — UI 는 항상 렌더.
 */
export default function AuthBar({
  labels,
  memberNav,
  variant = 'chromePills',
}: {
  labels: Labels;
  memberNav: MemberNavLabels;
  variant?: 'chromePills' | 'inline';
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
    return local.length > 12 ? `${local.slice(0, 10)}…` : local;
  }, [email]);

  const greetingSuffix = locale === 'ko' ? '님' : '';

  useEffect(() => {
    const sb = tryCreateBrowserClient();
    if (!sb) {
      setEmail(null);
      setLoading(false);
      return;
    }
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
    const sb = tryCreateBrowserClient();
    if (sb) await sb.auth.signOut();
    setEmail(null);
    router.refresh();
  }

  const isChrome = variant === 'chromePills';

  if (loading) {
    if (isChrome) {
      return (
        <div className="auth-chrome-pills auth-chrome-pills--loading" aria-busy="true">
          <span className="auth-chrome-pills__dot" />
          <span className="auth-chrome-pills__dot" />
          <span className="auth-chrome-pills__dot" />
        </div>
      );
    }
    return <span className="auth-bar auth-bar--muted">…</span>;
  }

  if (!email) {
    if (isChrome) {
      return (
        <div className="auth-chrome-pills auth-chrome-pills--guest" role="navigation" aria-label="계정">
          <Link
            href={`/auth/login?next=${authNext}`}
            className="auth-chrome-pills__pill auth-chrome-pills__pill--primary"
          >
            {labels.login}
          </Link>
          <Link
            href={`/auth/signup?next=${authNext}`}
            className="auth-chrome-pills__pill auth-chrome-pills__pill--ghost"
          >
            {labels.signup}
          </Link>
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

  if (isChrome) {
    return (
      <nav className="auth-chrome-pills auth-chrome-pills--member" aria-label={memberNav.ariaLabel}>
        <Link href="/minihome" className="auth-chrome-pills__pill auth-chrome-pills__pill--mini">
          {memberNav.minihome}
        </Link>
        <Link href="/ilchon#ilchon-notes" className="auth-chrome-pills__link">
          {memberNav.notesInbox}
        </Link>
        <Link href="/ilchon#ilchon-friends" className="auth-chrome-pills__link">
          {memberNav.friends}
        </Link>
        <span className="auth-chrome-pills__who" title={email}>
          <strong>{displayLocal}</strong>
          {greetingSuffix}
        </span>
        <button
          type="button"
          className="auth-chrome-pills__pill auth-chrome-pills__pill--ghost"
          onClick={() => void logout()}
        >
          {labels.logout}
        </button>
      </nav>
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
