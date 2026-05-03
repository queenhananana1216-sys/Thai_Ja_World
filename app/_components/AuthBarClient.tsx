'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase/client';
import { TJ_THAI_BALANCE_REFETCH } from '@/lib/thaiBalanceBroadcast';
import ThaiOdometerNumber from './ThaiOdometerNumber';

export type AuthBarInitialUser = {
  id: string;
  email: string | null;
};

type Labels = {
  login: string;
  signup: string;
  logout: string;
};

type Props = {
  initialUser: AuthBarInitialUser | null;
  initialDisplayName: string | null;
  /** SSR에서 `profiles.thai_balance` — 로그인 시에만 숫자 */
  initialThaiBalance?: number | null;
  /** 숫자 콤마 로캘 — `GlobalNav`의 `getLocale()`과 맞춤 */
  numberLocale?: string;
  labels: Labels;
  /** 로그인 시 미니홈(프로필) 링크 — 서버에서만 계산 */
  profileHref: string | null;
  /** 「내 미니홈」버튼 라벨 (GlobalNav i18n) */
  myMinihomeLabel?: string;
  masterAdminLabel?: string;
  /** 서버에서 `resolveAdminForUser`로 계산 */
  showMasterAdmin?: boolean;
  variant?: 'header' | 'mobile';
};

const masterAdminHeaderClass =
  'inline-flex min-h-11 shrink-0 items-center rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-600/30 via-amber-500/15 to-yellow-600/20 px-4 py-2 text-sm font-bold text-amber-50 no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_32px_rgba(251,191,36,0.24)] backdrop-blur-md transition hover:border-amber-300/70 hover:from-amber-500/40 hover:to-yellow-500/30';

const minihomeHeaderClass =
  'inline-flex min-h-11 shrink-0 items-center rounded-full border border-fuchsia-400/35 bg-gradient-to-r from-fuchsia-600/35 to-violet-600/35 px-4 py-2 text-sm font-bold text-fuchsia-50 no-underline shadow-[0_0_24px_rgba(192,38,211,0.25)] transition hover:border-fuchsia-300/60 hover:from-fuchsia-500/45 hover:to-violet-500/45';

const masterAdminMobileClass =
  'flex min-h-11 items-center justify-center rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-600/40 to-amber-950/50 px-3 py-2 text-center text-base font-bold text-amber-50 no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_40px_rgba(251,191,36,0.18)] backdrop-blur-md';

const minihomeMobileClass =
  'flex min-h-11 items-center justify-center rounded-md border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-600/40 to-violet-600/35 px-3 py-2 text-center text-base font-bold text-fuchsia-50 no-underline';

export default function AuthBarClient({
  initialUser,
  initialDisplayName,
  initialThaiBalance = null,
  numberLocale = 'ko-KR',
  labels,
  profileHref,
  myMinihomeLabel = '내 미니홈',
  masterAdminLabel = '마스터 관리자',
  showMasterAdmin = false,
  variant = 'header',
}: Props) {
  const router = useRouter();
  const sb = useMemo(() => createBrowserClient(), []);

  /** SSR의 showMasterAdmin 과 불일치할 수 있어, 클라이언트 세션으로 재확인 */
  const [masterAdminUi, setMasterAdminUi] = useState(showMasterAdmin);

  const [user, setUser] = useState<User | null>(() =>
    initialUser
      ? ({
          id: initialUser.id,
          email: initialUser.email,
        } as User)
      : null,
  );
  const [displayName, setDisplayName] = useState<string | null>(initialDisplayName);
  const [thaiBalance, setThaiBalance] = useState<number | null>(() =>
    typeof initialThaiBalance === 'number' && Number.isFinite(initialThaiBalance)
      ? Math.max(0, Math.floor(initialThaiBalance))
      : null,
  );

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
      if (!u) {
        setThaiBalance(null);
      }
    },
    [],
  );

  const refreshThaiBalance = useCallback(
    async (uid: string) => {
      try {
        const { data, error } = await sb.from('profiles').select('thai_balance').eq('id', uid).maybeSingle();
        if (error || !data) return;
        const b = (data as { thai_balance?: unknown }).thai_balance;
        if (typeof b === 'number' && Number.isFinite(b)) {
          setThaiBalance(Math.max(0, Math.floor(b)));
        }
      } catch {
        /* ignore */
      }
    },
    [sb],
  );

  useEffect(() => {
    setMasterAdminUi(showMasterAdmin);
  }, [showMasterAdmin]);

  useEffect(() => {
    if (typeof initialThaiBalance === 'number' && Number.isFinite(initialThaiBalance)) {
      setThaiBalance(Math.max(0, Math.floor(initialThaiBalance)));
    } else if (!initialUser) {
      setThaiBalance(null);
    }
  }, [initialThaiBalance, initialUser]);

  const refreshMasterAdminFlag = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/master-admin', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!r.ok) return;
      const d = (await r.json()) as { masterAdmin?: boolean };
      if (typeof d.masterAdmin === 'boolean') setMasterAdminUi(d.masterAdmin);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialId = initialUser?.id ?? null;
    void sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const u = data.session?.user ?? null;
      syncFromSupabaseUser(u);
      const nextId = u?.id ?? null;
      if (nextId) {
        void refreshThaiBalance(nextId);
      }
      if (initialId !== nextId) {
        router.refresh();
      }
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, session) => {
      syncFromSupabaseUser(session?.user ?? null);
      const uid = session?.user?.id;
      if (uid) {
        void refreshThaiBalance(uid);
      } else {
        setThaiBalance(null);
      }
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [initialUser?.id, refreshThaiBalance, router, sb.auth, syncFromSupabaseUser]);

  useEffect(() => {
    if (!user?.id) {
      setMasterAdminUi(false);
      return;
    }
    void refreshMasterAdminFlag();
  }, [user?.id, refreshMasterAdminFlag]);

  useEffect(() => {
    if (!user?.id) return;
    const onRefetch = () => void refreshThaiBalance(user.id);
    window.addEventListener(TJ_THAI_BALANCE_REFETCH, onRefetch);
    return () => window.removeEventListener(TJ_THAI_BALANCE_REFETCH, onRefetch);
  }, [user?.id, refreshThaiBalance]);

  useEffect(() => {
    if (!user?.id) return;
    const iv = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshThaiBalance(user.id);
    }, 22_000);
    return () => window.clearInterval(iv);
  }, [user?.id, refreshThaiBalance]);

  const handleLogout = useCallback(async () => {
    await sb.auth.signOut();
    setUser(null);
    setDisplayName(null);
    setThaiBalance(null);
    setMasterAdminUi(false);
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

  const hrefProfile = profileHref || '/minihome';

  const thaiSuffix = numberLocale.startsWith('th') ? 'THAI' : '타이';
  const walletChip =
    thaiBalance != null ? (
      <span
        className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border-[0.5px] border-cyan-400/35 bg-gradient-to-r from-indigo-950/70 via-slate-950/80 to-cyan-950/45 px-2.5 py-1 text-xs font-extrabold tabular-nums text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:text-sm"
        title={numberLocale.startsWith('th') ? 'THAI balance' : '보유 타이(THAI)'}
      >
        <span aria-hidden>฿</span>
        <span className="min-w-0 truncate">
          <ThaiOdometerNumber value={thaiBalance} locale={numberLocale} /> {thaiSuffix}
        </span>
      </span>
    ) : null;

  if (!user) {
    if (variant === 'mobile') {
      return (
        <>
          <Link
            prefetch={true}
            href="/auth/login"
            className="flex min-h-11 items-center justify-center rounded-md border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-center text-base font-semibold text-violet-50 no-underline"
          >
            {labels.login}
          </Link>
          <Link
            prefetch={true}
            href="/auth/signup"
            className="flex min-h-11 items-center justify-center rounded-md border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-center text-base font-semibold text-pink-50 no-underline"
          >
            {labels.signup}
          </Link>
        </>
      );
    }
    return (
      <div className="auth-chrome-pills auth-chrome-pills--guest" role="navigation" aria-label="계정">
        <Link prefetch={true} href="/auth/login" className="auth-chrome-pills__pill auth-chrome-pills__pill--primary">
          {labels.login}
        </Link>
        <Link prefetch={true} href="/auth/signup" className="auth-chrome-pills__pill auth-chrome-pills__pill--ghost">
          {labels.signup}
        </Link>
      </div>
    );
  }

  if (variant === 'mobile') {
    return (
      <>
        {masterAdminUi ? (
          <Link prefetch={true} href="/admin" className={masterAdminMobileClass}>
            ⚙️ {masterAdminLabel}
          </Link>
        ) : null}
        {shortLabel ? (
          <span className="flex min-h-9 items-center px-1 text-sm font-semibold text-slate-200">
            <span className="max-w-[200px] truncate">{shortLabel}</span>
          </span>
        ) : null}
        {walletChip ? <div className="flex w-full justify-center py-0.5">{walletChip}</div> : null}
        <Link
          prefetch={true}
          href={hrefProfile}
          className={minihomeMobileClass}
          title={shortLabel ? `${shortLabel} · ${myMinihomeLabel}` : myMinihomeLabel}
        >
          🏠 {myMinihomeLabel}
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
    <div
      className="flex flex-wrap items-center justify-end gap-2"
      role="navigation"
      aria-label="계정"
    >
      {masterAdminUi ? (
        <Link prefetch={true} href="/admin" className={masterAdminHeaderClass}>
          ⚙️ {masterAdminLabel}
        </Link>
      ) : null}
      {shortLabel ? (
        <span className="hidden max-w-[min(10rem,22vw)] truncate text-sm font-semibold text-slate-200 sm:inline">
          {shortLabel}
        </span>
      ) : null}
      {walletChip}
      <Link
        prefetch={true}
        href={hrefProfile}
        className={minihomeHeaderClass}
        title={shortLabel ? `${shortLabel} · ${myMinihomeLabel}` : myMinihomeLabel}
      >
        🏠 {myMinihomeLabel}
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
