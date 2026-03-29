'use client';

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export type ShopSpotPayload = {
  id: string;
  name: string;
  description: string | null;
  line_url: string | null;
  photo_urls: unknown;
  minihome_public_slug: string | null;
  minihome_intro: string | null;
  minihome_theme: unknown;
  minihome_bgm_url: string | null;
  minihome_menu: unknown;
  minihome_layout_modules: unknown;
  minihome_extra: unknown;
  is_published: boolean;
};

const DEFAULT_LAYOUT = ['intro', 'menu', 'line', 'photos'] as const;

function asStringRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function photoList(photo_urls: unknown): string[] {
  if (!Array.isArray(photo_urls)) return [];
  return photo_urls.map((u) => String(u).trim()).filter(Boolean);
}

type MenuItem = {
  name?: string;
  price?: string;
  description?: string;
  image_url?: string;
};

function menuItems(raw: unknown): MenuItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => (x && typeof x === 'object' ? (x as MenuItem) : {}));
}

export default function ShopMinihomeClient({ spot }: { spot: ShopSpotPayload }) {
  const theme = useMemo(() => asStringRecord(spot.minihome_theme), [spot.minihome_theme]);
  const accent = typeof theme.accent === 'string' ? theme.accent : '#7c3aed';
  const wallpaper =
    typeof theme.wallpaper_url === 'string' && theme.wallpaper_url.trim()
      ? theme.wallpaper_url.trim()
      : '';
  const bgFallback =
    typeof theme.page_bg === 'string' && theme.page_bg.trim() ? theme.page_bg.trim() : '#0f172a';

  const layout = useMemo(() => {
    const m = spot.minihome_layout_modules;
    if (!Array.isArray(m)) return [...DEFAULT_LAYOUT];
    const xs = m.filter((x): x is string => typeof x === 'string' && x.length > 0);
    return xs.length ? xs : [...DEFAULT_LAYOUT];
  }, [spot.minihome_layout_modules]);

  const photos = useMemo(() => photoList(spot.photo_urls), [spot.photo_urls]);
  const menu = useMemo(() => menuItems(spot.minihome_menu), [spot.minihome_menu]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [bgmOn, setBgmOn] = useState(false);

  const bgmUrl = spot.minihome_bgm_url?.trim() || '';

  function toggleBgm() {
    const el = audioRef.current;
    if (!el || !bgmUrl) return;
    if (bgmOn) {
      el.pause();
      setBgmOn(false);
    } else {
      void el.play().then(() => setBgmOn(true)).catch(() => setBgmOn(false));
    }
  }

  const shellStyle: CSSProperties = {
    minHeight: '70vh',
    backgroundColor: bgFallback,
    backgroundImage: wallpaper ? `url(${wallpaper})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#f8fafc',
  };

  const cardStyle: CSSProperties = {
    maxWidth: 560,
    margin: '0 auto',
    padding: 24,
    borderRadius: 16,
    background: 'rgba(15,23,42,0.82)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.08)',
  };

  function Section({ id, children }: { id: string; children: ReactNode }) {
    if (!layout.includes(id)) return null;
    return <>{children}</>;
  }

  return (
    <div style={shellStyle}>
      {bgmUrl ? <audio ref={audioRef} src={bgmUrl} loop preload="none" /> : null}

      <div style={{ ...cardStyle, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{spot.name}</h1>
            {!spot.is_published ? (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#fbbf24' }}>비공개 미리보기 (오너·운영)</p>
            ) : null}
          </div>
          {bgmUrl ? (
            <button
              type="button"
              onClick={toggleBgm}
              style={{
                flexShrink: 0,
                padding: '8px 12px',
                borderRadius: 999,
                border: 'none',
                background: accent,
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {bgmOn ? 'BGM 끄기' : 'BGM 켜기'}
            </button>
          ) : null}
        </div>

        <Section id="intro">
          {spot.minihome_intro?.trim() || spot.description?.trim() ? (
            <p style={{ marginTop: 16, lineHeight: 1.6, opacity: 0.95, whiteSpace: 'pre-wrap' }}>
              {spot.minihome_intro?.trim() || spot.description}
            </p>
          ) : null}
        </Section>

        <Section id="menu">
          {menu.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}>
              {menu.map((it, i) => (
                <li
                  key={i}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image_url}
                      alt=""
                      width={56}
                      height={56}
                      style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : null}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong>{it.name || '메뉴'}</strong>
                      {it.price ? (
                        <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{it.price}</span>
                      ) : null}
                    </div>
                    {it.description ? (
                      <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{it.description}</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section id="line">
          {spot.line_url?.trim() ? (
            <p style={{ marginTop: 20 }}>
              <a
                href={spot.line_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#86efac', fontWeight: 700 }}
              >
                LINE으로 연결
              </a>
            </p>
          ) : null}
        </Section>

        <Section id="photos">
          {photos.length > 0 ? (
            <div
              style={{
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 8,
              }}
            >
              {photos.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={u}
                  src={u}
                  alt=""
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }}
                />
              ))}
            </div>
          ) : null}
        </Section>
      </div>
    </div>
  );
}
