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
  openSlug: string | null;
  open: (slug: string) => void;
  close: () => void;
};

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
  const { openSlug, close } = ctx;
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
      const { data: row, error } = await sb
        .from('user_minihomes')
        .select(
          'owner_id, public_slug, title, tagline, intro_body, theme, layout_modules, is_public',
        )
        .eq('public_slug', openSlug)
        .maybeSingle();

      if (cancelled) return;
      setLoading(false);
      if (error || !row || !row.is_public) {
        setErr(true);
        setData(null);
        return;
      }
      setData(row as MinihomePublicRow);
    })();

    return () => {
      cancelled = true;
    };
  }, [openSlug]);

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
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const open = useCallback((slug: string) => setOpenSlug(slug.trim()), []);
  const close = useCallback(() => setOpenSlug(null), []);
  const value = useMemo(() => ({ openSlug, open, close }), [openSlug, open, close]);

  return (
    <MinihomeOverlayContext.Provider value={value}>
      {children}
      <MinihomeOverlayPortal />
    </MinihomeOverlayContext.Provider>
  );
}
