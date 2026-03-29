'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import type { MinihomePublicRow } from '@/types/minihome';
import { parseLayoutModules, parseTheme, safeAccent } from '@/types/minihome';
import { createBrowserClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatDate';

const FALLBACK_ACCENT = '#7c3aed';

type GbRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
};

type Props = {
  data: MinihomePublicRow;
  labels: Dictionary['minihome'];
  navCommunity: string;
  variant: 'page' | 'overlay';
  onClose?: () => void;
};

function CyWindow({
  title,
  open,
  onClose,
  accent,
  variant,
  winClass,
  children,
  closeLabel,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  accent: string;
  variant: 'page' | 'overlay';
  winClass: string;
  children: ReactNode;
  closeLabel: string;
}) {
  if (!open) return null;
  return (
    <div
      className={`minihome-cy-win ${winClass}${variant === 'overlay' ? ' minihome-cy-win--in-overlay' : ''}`}
      style={{ borderColor: accent }}
      role="dialog"
      aria-label={title}
    >
      <div className="minihome-cy-win__head" style={{ background: `${accent}18` }}>
        <span className="minihome-cy-win__title">{title}</span>
        <button type="button" className="minihome-cy-win__x" onClick={onClose} aria-label={closeLabel}>
          ×
        </button>
      </div>
      <div className="minihome-cy-win__body">{children}</div>
    </div>
  );
}

export default function MinihomeRoomView({
  data,
  labels,
  navCommunity,
  variant,
  onClose,
}: Props) {
  const theme = parseTheme(data.theme);
  const accent = safeAccent(theme.accent, FALLBACK_ACCENT);
  const modules = parseLayoutModules(data.layout_modules);
  const wallpaper = theme.wallpaper?.trim();

  const [winGuest, setWinGuest] = useState(false);
  const [winVisitor, setWinVisitor] = useState(false);
  const [winPhotos, setWinPhotos] = useState(false);
  const [gbRows, setGbRows] = useState<GbRow[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [gbLoading, setGbLoading] = useState(false);

  const loadGuestbook = useCallback(async () => {
    if (!data.owner_id) return;
    setGbLoading(true);
    const sb = createBrowserClient();
    const { data: rows, error } = await sb
      .from('minihome_guestbook_entries')
      .select('id, body, created_at, author_id')
      .eq('minihome_owner_id', data.owner_id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(80);

    if (error || !rows) {
      setGbRows([]);
      setNames({});
      setGbLoading(false);
      return;
    }

    const list = rows as GbRow[];
    setGbRows(list);
    const ids = [...new Set(list.map((r) => r.author_id))];
    if (ids.length === 0) {
      setNames({});
      setGbLoading(false);
      return;
    }
    const { data: profs } = await sb.from('profiles').select('id, display_name').in('id', ids);
    const map: Record<string, string> = {};
    for (const p of profs ?? []) {
      map[p.id as string] = ((p.display_name as string) || '').trim() || 'member';
    }
    setNames(map);
    setGbLoading(false);
  }, [data.owner_id]);

  useEffect(() => {
    if (!winGuest && !winVisitor) return;
    void loadGuestbook();
  }, [winGuest, winVisitor, loadGuestbook]);

  const visitorOrder = useMemo(() => {
    if (!gbRows?.length) return [];
    return [...gbRows].reverse();
  }, [gbRows]);

  const paperStyle: CSSProperties = {
    borderColor: accent,
    boxShadow: `0 0 0 1px ${accent}22, 0 12px 40px rgba(74, 66, 88, 0.12)`,
  };

  const showIntro = modules.includes('intro') && Boolean(data.intro_body?.trim());
  const layoutMod = {
    '--mh-accent': accent,
    ...(wallpaper
      ? {
          backgroundImage: `linear-gradient(rgba(255,253,254,0.88), rgba(255,253,254,0.92)), url(${wallpaper})`,
        }
      : {}),
  } as CSSProperties & { '--mh-accent': string };

  function toggle(setter: (v: boolean) => void, cur: boolean) {
    setter(!cur);
  }

  return (
    <div
      className={`minihome-room minihome-cy-layout${variant === 'overlay' ? ' minihome-room--overlay' : ''}`}
      style={layoutMod}
    >
      {variant === 'overlay' && onClose ? (
        <div className="minihome-room__overlay-bar">
          <button type="button" className="minihome-room__close" onClick={onClose}>
            {labels.closeOverlay}
          </button>
          <Link
            href={`/minihome/${data.public_slug}`}
            className="minihome-room__full-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {labels.openFullPage}
          </Link>
        </div>
      ) : null}

      <nav className="minihome-cy-menu" aria-label="minihome-panels">
        <button
          type="button"
          className={
            'minihome-cy-menu__btn' +
            (!winGuest && !winVisitor && !winPhotos ? ' minihome-cy-menu__btn--active' : '')
          }
          onClick={() => {
            setWinGuest(false);
            setWinVisitor(false);
            setWinPhotos(false);
          }}
        >
          <span className="minihome-cy-menu__emoji" aria-hidden>
            🏠
          </span>
          <span className="minihome-cy-menu__txt">{labels.cyMenuMain}</span>
        </button>
        {modules.includes('guestbook') ? (
          <button
            type="button"
            className={'minihome-cy-menu__btn' + (winGuest ? ' minihome-cy-menu__btn--active' : '')}
            onClick={() => toggle(setWinGuest, winGuest)}
          >
            <span className="minihome-cy-menu__emoji" aria-hidden>
              💬
            </span>
            <span className="minihome-cy-menu__txt">{labels.cyMenuGuestbook}</span>
          </button>
        ) : null}
        {modules.includes('guestbook') ? (
          <button
            type="button"
            className={'minihome-cy-menu__btn' + (winVisitor ? ' minihome-cy-menu__btn--active' : '')}
            onClick={() => toggle(setWinVisitor, winVisitor)}
          >
            <span className="minihome-cy-menu__emoji" aria-hidden>
              📖
            </span>
            <span className="minihome-cy-menu__txt">{labels.cyMenuVisitor}</span>
          </button>
        ) : null}
        {modules.includes('photos') ? (
          <button
            type="button"
            className={'minihome-cy-menu__btn' + (winPhotos ? ' minihome-cy-menu__btn--active' : '')}
            onClick={() => toggle(setWinPhotos, winPhotos)}
          >
            <span className="minihome-cy-menu__emoji" aria-hidden>
              🖼️
            </span>
            <span className="minihome-cy-menu__txt">{labels.cyMenuPhotos}</span>
          </button>
        ) : null}
      </nav>

      <div className="minihome-cy-stage">
        <div className="minihome-room__paper minihome-cy-stage__paper" style={paperStyle}>
          <header className="minihome-room__header">
            <p className="minihome-room__slug">/{data.public_slug}</p>
            <h1 className="minihome-room__title" id="minihome-room-title">
              {data.title ?? data.public_slug}
            </h1>
            {data.tagline ? <p className="minihome-room__tagline">{data.tagline}</p> : null}
          </header>

          {showIntro ? (
            <section className="minihome-room__section">
              <h2 className="minihome-room__section-title">{labels.sectionIntro}</h2>
              <div className="minihome-room__intro-body">{data.intro_body}</div>
            </section>
          ) : (
            <p className="minihome-cy-stage__hint">{labels.cyIntroEmpty}</p>
          )}

          {variant === 'page' ? (
            <footer className="minihome-room__footer">
              <Link href="/community/boards">{navCommunity}</Link>
            </footer>
          ) : null}
        </div>

        <CyWindow
          title={labels.cyGuestbookTitle}
          open={winGuest}
          onClose={() => setWinGuest(false)}
          accent={accent}
          variant={variant}
          winClass="minihome-cy-win--guest"
          closeLabel={labels.cyWindowClose}
        >
          {gbLoading ? (
            <p className="minihome-cy-win__muted">…</p>
          ) : !gbRows?.length ? (
            <>
              <p className="minihome-cy-win__muted">{labels.cyGuestbookEmpty}</p>
              <p className="minihome-cy-win__soon">{labels.cyGuestbookWriteSoon}</p>
            </>
          ) : (
            <ul className="minihome-cy-win__list">
              {gbRows.map((r) => (
                <li key={r.id} className="minihome-cy-win__item">
                  <div className="minihome-cy-win__meta">
                    {names[r.author_id] ?? 'member'} · {formatDate(r.created_at)}
                  </div>
                  <div className="minihome-cy-win__text">{r.body}</div>
                </li>
              ))}
            </ul>
          )}
        </CyWindow>

        <CyWindow
          title={labels.cyVisitorTitle}
          open={winVisitor}
          onClose={() => setWinVisitor(false)}
          accent={accent}
          variant={variant}
          winClass="minihome-cy-win--visitor"
          closeLabel={labels.cyWindowClose}
        >
          {gbLoading ? (
            <p className="minihome-cy-win__muted">…</p>
          ) : !visitorOrder.length ? (
            <>
              <p className="minihome-cy-win__muted">{labels.cyVisitorEmpty}</p>
              <p className="minihome-cy-win__soon">{labels.cyVisitorWriteSoon}</p>
            </>
          ) : (
            <ul className="minihome-cy-win__list">
              {visitorOrder.map((r) => (
                <li key={r.id} className="minihome-cy-win__item">
                  <div className="minihome-cy-win__meta">
                    {names[r.author_id] ?? 'member'} · {formatDate(r.created_at)}
                  </div>
                  <div className="minihome-cy-win__text">{r.body}</div>
                </li>
              ))}
            </ul>
          )}
        </CyWindow>

        <CyWindow
          title={labels.cyPhotosTitle}
          open={winPhotos}
          onClose={() => setWinPhotos(false)}
          accent={accent}
          variant={variant}
          winClass="minihome-cy-win--photos"
          closeLabel={labels.cyWindowClose}
        >
          <p className="minihome-cy-win__muted">{labels.albumLocked}</p>
        </CyWindow>
      </div>
    </div>
  );
}
