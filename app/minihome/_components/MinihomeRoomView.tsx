'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import type { Dictionary } from '@/i18n/dictionaries';
import type { MinihomePublicRow } from '@/types/minihome';
import { parseLayoutModules, parseTheme, safeAccent } from '@/types/minihome';

const FALLBACK_ACCENT = '#7c3aed';

type Props = {
  data: MinihomePublicRow;
  labels: Dictionary['minihome'];
  navCommunity: string;
  variant: 'page' | 'overlay';
  onClose?: () => void;
};

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

  const paperStyle: CSSProperties = {
    borderColor: accent,
    boxShadow: `0 0 0 1px ${accent}22, 0 12px 40px rgba(74, 66, 88, 0.12)`,
  };

  return (
    <div
      className={`minihome-room${variant === 'overlay' ? ' minihome-room--overlay' : ''}`}
      style={
        {
          '--mh-accent': accent,
          ...(wallpaper ? { backgroundImage: `linear-gradient(rgba(255,253,254,0.88), rgba(255,253,254,0.92)), url(${wallpaper})` } : {}),
        } as CSSProperties & { '--mh-accent': string }
      }
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
      <div className="minihome-room__paper" style={paperStyle}>
        <header className="minihome-room__header">
          <p className="minihome-room__slug">/{data.public_slug}</p>
          <h1 className="minihome-room__title" id="minihome-room-title">
            {data.title ?? data.public_slug}
          </h1>
          {data.tagline ? <p className="minihome-room__tagline">{data.tagline}</p> : null}
        </header>

        {modules.map((id, idx) => {
          if (id === 'intro') {
            if (!data.intro_body?.trim()) return null;
            return (
              <section key={`intro-${idx}`} className="minihome-room__section">
                <h2 className="minihome-room__section-title">{labels.sectionIntro}</h2>
                <div className="minihome-room__intro-body">{data.intro_body}</div>
              </section>
            );
          }
          if (id === 'guestbook') {
            return (
              <section key={`guestbook-${idx}`} className="minihome-room__section minihome-room__section--soon">
                <h2 className="minihome-room__section-title">{labels.sectionGuestbook}</h2>
                <p className="minihome-room__soon">{labels.guestbookLocked}</p>
              </section>
            );
          }
          if (id === 'photos') {
            return (
              <section key={`photos-${idx}`} className="minihome-room__section minihome-room__section--soon">
                <h2 className="minihome-room__section-title">{labels.sectionPhotos}</h2>
                <p className="minihome-room__soon">{labels.albumLocked}</p>
              </section>
            );
          }
          return null;
        })}

        {variant === 'page' ? (
          <footer className="minihome-room__footer">
            <Link href="/community/boards">{navCommunity}</Link>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
