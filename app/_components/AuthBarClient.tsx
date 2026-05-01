'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase/client';

export type AuthBarInitialUser = {
  id: string;
  email: string | null;
};

type Labels = {
  login: string;
  signup: string;
  logout: string;
};

function avatarGlyph(displayName: string | null | undefined, email: string | null | undefined) {
  const raw = (displayName || email || '?').trim();
  const ch = raw.codePointAt(0);
  return ch !== undefined ? String.fromCodePoint(ch).toUpperCase() : '?';
}

type Props = {
  initialUser: AuthBarInitialUser | null;
  initialDisplayName: string | null;
  labels: Labels;
  /** 로그인 시 미니홈(프로필) 링크 — 서버에서만 계산 */
  profileHref: string | null;
  variant?: 'header' | 'mobile';
};

export default function AuthBarClient({
  initialUser,
  initialDisplayName,
  labels,
  profileHref,
  variant = 'header',
}: Props) {
  const router = useRouter();
  const sb = useMemo(() => createBrowserClient(), []);

  const [user, setUser] = useState<User | null>(() =>
    initialUser
      ? ({
          id: initialUser.id,
          email: initialUser.email,
        } as User)
      : null,
  );
  const [displayName, setDisplayName] = useState<string | null>(initialDisplayName);

  const syncFromSupabaseUser = useCallback(
    (u: User | null) => {
      setUser(u);
      const metaName =
        typeof u?.user_metadata?.display_name === 'string' ? u.user_metadata.display_name.trim() : '';
      const metaFull =
        typeof u?.user_metadata?.full_name === 'string' ? u.user_metadata.full_name.trim() : '';
      if (metaName || metaFull) {
        setDisplayName(metaName || metaFull || null);
      } else if (!u) {
        setDisplayName(null);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const initialId = initialUser?.id ?? null;
    void sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const u = data.session?.user ?? null;
      syncFromSupabaseUser(u);
      const nextId = u?.id ?? null;
      if (initialId !== nextId) {
        router.refresh();
      }
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, session) => {
      syncFromSupabaseUser(session?.user ?? null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [initialUser?.id, router, sb.auth, syncFromSupabaseUser]);

  const handleLogout = useCallback(async () => {
    await sb.auth.signOut();
    setUser(null);
    setDisplayName(null);
    router.refresh();
  }, [router, sb.auth]);

  const shortLabel = useMemo(() => {
    const nick = (displayName || '').trim();
    if (nick) return nick.length > 12 ? `${nick.slice(0, 12)}…` : nick;
    const em = user?.email?.trim();
    if (em) {
      const local = em.split('@')[0] || em;
      return local.length > 14 ? `${local.slice(0, 14)}…` : local;
    }
    return 'Member';
  }, [displayName, user?.email]);

  const glyph = avatarGlyph(displayName, user?.email ?? null);
  const hrefProfile = profileHref || '/minihome';

  if (!user) {
    if (variant === 'mobile') {
      return (
        <>
          <a
            href="/auth/login"
            className="flex min-h-11 items-center justify-center rounded-md border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-center text-base font-semibold text-violet-50 no-underline"
          >
            {labels.login}
          </a>
          <a
            href="/auth/signup"
            className="flex min-h-11 items-center justify-center rounded-md border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-center text-base font-semibold text-pink-50 no-underline"
          >
            {labels.signup}
          </a>
        </>
      );
    }
    return (
      <div className="auth-chrome-pills auth-chrome-pills--guest" role="navigation" aria-label="계정">
        <a href="/auth/login" className="auth-chrome-pills__pill auth-chrome-pills__pill--primary">
          {labels.login}
        </a>
        <a href="/auth/signup" className="auth-chrome-pills__pill auth-chrome-pills__pill--ghost">
          {labels.signup}
        </a>
      </div>
    );
  }

  if (variant === 'mobile') {
    return (
      <>
        <Link
          href={hrefProfile}
          className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-400/35 bg-emerald-950/40 px-3 py-2 text-center text-base font-bold text-emerald-50 no-underline"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-900/80 text-sm font-extrabold text-emerald-100"
            aria-hidden
          >
            {glyph}
          </span>
          <span className="min-w-0 truncate">{shortLabel}</span>
        </Link>
        <button
          type="button"
          className="flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-white/15 bg-slate-800/80 px-3 py-2 text-center text-base font-semibold text-gray-100"
          onClick={() => void handleLogout()}
        >
          {labels.logout}
        </button>
      </>
    );
  }

  return (
    <div className="auth-chrome-pills auth-chrome-pills--member" role="navigation" aria-label="계정">
      <Link
        href={hrefProfile}
        className="auth-chrome-pills__link inline-flex items-center gap-2 no-underline"
        title={shortLabel}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-400/45 bg-slate-900/90 text-sm font-extrabold text-amber-100"
          aria-hidden
        >
          {glyph}
        </span>
        <span className="auth-chrome-pills__who">
          <strong>{shortLabel}</strong>
        </span>
      </Link>
      <button
        type="button"
        className="auth-chrome-pills__pill auth-chrome-pills__pill--ghost cursor-pointer"
        onClick={() => void handleLogout()}
      >
        {labels.logout}
      </button>
    </div>
  );
}
