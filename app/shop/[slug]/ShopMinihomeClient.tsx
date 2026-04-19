'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

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

const DEFAULT_LAYOUT = ['intro', 'menu', 'line', 'photos', 'guestbook'] as const;

type GuestRow = { id: string; body: string; created_at: string; author_id: string };

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

function formatGbDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
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
  const extra = useMemo(() => asStringRecord(spot.minihome_extra), [spot.minihome_extra]);
  const openingHoursText =
    typeof extra.opening_hours_text === 'string' ? extra.opening_hours_text.trim() : '';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [bgmOn, setBgmOn] = useState(false);

  const [gbRows, setGbRows] = useState<GuestRow[]>([]);
  const [gbNames, setGbNames] = useState<Record<string, string>>({});
  const [gbLoading, setGbLoading] = useState(false);
  const [gbBody, setGbBody] = useState('');
  const [gbPosting, setGbPosting] = useState(false);
  const [gbUserId, setGbUserId] = useState<string | null | undefined>(undefined);
  const [gbMsg, setGbMsg] = useState<string | null>(null);

  const loadGuestbook = useCallback(async () => {
    if (!spot.id) return;
    setGbLoading(true);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    setGbUserId(user?.id ?? null);

    const { data: rows, error } = await sb
      .from('local_shop_guestbook_entries')
      .select('id, body, created_at, author_id')
      .eq('local_spot_id', spot.id)
      .order('created_at', { ascending: false })
      .limit(60);

    if (error || !rows) {
      setGbRows([]);
      setGbNames({});
      setGbLoading(false);
      return;
    }

    const list = rows as GuestRow[];
    setGbRows(list);
    const ids = [...new Set(list.map((r) => r.author_id))];
    if (ids.length === 0) {
      setGbNames({});
      setGbLoading(false);
      return;
    }
    const { data: profs } = await sb.from('profiles').select('id, display_name').in('id', ids);
    const map: Record<string, string> = {};
    for (const p of profs ?? []) {
      map[p.id as string] = ((p.display_name as string) || '').trim() || '회원';
    }
    setGbNames(map);
    setGbLoading(false);
  }, [spot.id]);

  useEffect(() => {
    if (!layout.includes('guestbook')) return;
    void loadGuestbook();
  }, [layout, loadGuestbook]);

  const bgmUrl = spot.minihome_bgm_url?.trim() || '';

  async function submitGuestbook() {
    if (!spot.id || gbPosting) return;
    const t = gbBody.trim();
    if (t.length < 2) {
      setGbMsg('2자 이상 입력해 주세요.');
      return;
    }
    if (t.length > 2000) {
      setGbMsg('2000자 이내로 입력해 주세요.');
      return;
    }
    setGbPosting(true);
    setGbMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setGbMsg('로그인이 필요합니다.');
      setGbPosting(false);
      return;
    }
    if (!spot.is_published) {
      setGbMsg('비공개 가게에는 방명록을 남길 수 없습니다.');
      setGbPosting(false);
      return;
    }
    const { error } = await sb.from('local_shop_guestbook_entries').insert({
      local_spot_id: spot.id,
      author_id: user.id,
      body: t,
    });
    setGbPosting(false);
    if (error) {
      setGbMsg(error.message);
      return;
    }
    setGbBody('');
    await loadGuestbook();
  }

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

        {openingHoursText ? (
          <p style={{ marginTop: 16, lineHeight: 1.55, opacity: 0.92, whiteSpace: 'pre-wrap' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 }}>
              영업시간
            </span>
            {openingHoursText}
          </p>
        ) : null}

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

        <Section id="guestbook">
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 800 }}>방명록</h2>
            {gbLoading ? (
              <p style={{ fontSize: 13, opacity: 0.85 }}>불러오는 중…</p>
            ) : gbRows.length === 0 ? (
              <p style={{ fontSize: 13, opacity: 0.8 }}>첫 방명록을 남겨 보세요.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
                {gbRows.map((r) => (
                  <li
                    key={r.id}
                    style={{
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      fontSize: 14,
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>
                      {gbNames[r.author_id] ?? '회원'} · {formatGbDate(r.created_at)}
                    </div>
                    <div style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.body}</div>
                  </li>
                ))}
              </ul>
            )}

            {spot.is_published ? (
              gbUserId === undefined ? null : gbUserId ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {gbMsg ? (
                    <p style={{ margin: 0, fontSize: 13, color: gbMsg.includes('필요') ? '#fbbf24' : '#fca5a5' }}>
                      {gbMsg}
                    </p>
                  ) : null}
                  <textarea
                    value={gbBody}
                    onChange={(e) => setGbBody(e.target.value)}
                    placeholder="방명록을 남겨 주세요 (로그인 회원)"
                    rows={3}
                    maxLength={2000}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(0,0,0,0.25)',
                      color: '#f8fafc',
                      fontSize: 14,
                      resize: 'vertical',
                    }}
                  />
                  <button
                    type="button"
                    disabled={gbPosting}
                    onClick={() => void submitGuestbook()}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: accent,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: gbPosting ? 'wait' : 'pointer',
                      opacity: gbPosting ? 0.7 : 1,
                    }}
                  >
                    {gbPosting ? '등록 중…' : '등록'}
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: 13, margin: 0 }}>
                  <Link href={`/auth/login?next=${encodeURIComponent(`/shop/${spot.minihome_public_slug ?? ''}`)}`} style={{ color: '#a5b4fc', fontWeight: 700 }}>
                    로그인
                  </Link>
                  후 방명록을 남길 수 있습니다.
                </p>
              )
            ) : (
              <p style={{ fontSize: 12, opacity: 0.75, margin: 0 }}>비공개 가게입니다.</p>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
