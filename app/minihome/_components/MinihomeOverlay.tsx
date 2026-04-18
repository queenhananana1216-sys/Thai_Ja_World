'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';
import type { MinihomePublicRow } from '@/types/minihome';
import MinihomeRoomView from './MinihomeRoomView';

type OverlayCtx = {
  openTarget: OpenTarget;
  openSlug: string | null;
  open: (slug: string, ownerId?: string) => void;
  close: () => void;
};

type OpenTarget = {
  slug: string;
  ownerId?: string;
} | null;

const MinihomeOverlayContext = createContext<OverlayCtx | null>(null);

export function useMinihomeOverlay(): OverlayCtx {
  const c = useContext(MinihomeOverlayContext);
  if (!c) {
    throw new Error('useMinihomeOverlay는 MinihomeOverlayProvider 안에서만 사용하세요.');
  }
  return c;
}

function MinihomeOverlayPortal() {
  const ctx = useContext(MinihomeOverlayContext);
  if (!ctx) return null;
  const { openTarget, close } = ctx;
  const openSlug = openTarget?.slug ?? null;
  const { d } = useClientLocaleDictionary();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<MinihomePublicRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!openSlug) {
      el?.close();
      setData(null);
      setErr(false);
      setLoading(false);
      return;
    }

    el?.showModal();

    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(false);
      const sb = createBrowserClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      const ownerHint = openTarget?.ownerId;
      const baseSelect =
        'owner_id, public_slug, title, tagline, intro_body, theme, layout_modules, is_public, visit_count_today, visit_count_total, section_visibility';
      const queryByOwner = Boolean(ownerHint && user?.id && ownerHint === user.id);
      const query = queryByOwner
        ? sb.from('user_minihomes').select(baseSelect).eq('owner_id', ownerHint as string)
        : sb.from('user_minihomes').select(baseSelect).eq('public_slug', openSlug);
      const { data: row, error } = await query.maybeSingle();

      if (cancelled) return;
      setLoading(false);
      const canViewPrivateAsOwner = Boolean(row && user?.id && row.owner_id === user.id);
      if (error || !row || (!row.is_public && !canViewPrivateAsOwner)) {
        setErr(true);
        setData(null);
        return;
      }
      setData(row as MinihomePublicRow);
    })();

    return () => {
      cancelled = true;
    };
  }, [openSlug, openTarget]);

  if (!openSlug) return null;

  return (
    <dialog
      ref={dialogRef}
      className="minihome-overlay"
      aria-labelledby="minihome-room-title"
      onClose={close}
    >
      <div className="minihome-overlay__scrim" aria-hidden onClick={close} />
      <div
        className="minihome-overlay__sheet"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? <p className="minihome-overlay__state">{d.minihome.overlayLoading}</p> : null}
        {err && !loading ? (
          <p className="minihome-overlay__state minihome-overlay__state--err">{d.minihome.overlayLoadError}</p>
        ) : null}
        {data && !loading && !err ? (
          <MinihomeRoomView
            data={data}
            labels={d.minihome}
            ilchon={d.ilchon}
            navCommunity={d.nav.community}
            variant="overlay"
            onClose={close}
          />
        ) : null}
      </div>
    </dialog>
  );
}

export function MinihomeOverlayProvider({ children }: { children: ReactNode }) {
  const [openTarget, setOpenTarget] = useState<OpenTarget>(null);
  const openSlug = openTarget?.slug ?? null;
  const open = useCallback((slug: string, ownerId?: string) => {
    const normalized = slug.trim();
    setOpenTarget(normalized ? { slug: normalized, ownerId } : null);
  }, []);
  const close = useCallback(() => setOpenTarget(null), []);
  const value = useMemo(() => ({ openTarget, openSlug, open, close }), [openTarget, openSlug, open, close]);

  return (
    <MinihomeOverlayContext.Provider value={value}>
      {children}
      <MinihomeOverlayPortal />
    </MinihomeOverlayContext.Provider>
  );
}
