'use client';

/**
 * 로그인한 이용자 본인 미니홈 — 메타·메인룸 글·테마 편집 + 오버레이 미리보기.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';
import { mapStyleRpcError } from '@/lib/minihome/styleRpcMessages';
import { parseTheme, safeAccent } from '@/types/minihome';
import { useMinihomeOverlay } from './MinihomeOverlay';

const DEFAULT_ACCENT = '#7c3aed';

type Row = {
  owner_id: string;
  public_slug: string;
  title: string | null;
  tagline: string | null;
  intro_body: string | null;
  theme: unknown;
  is_public: boolean;
};

type ProfileRow = {
  style_score_total: number;
  signup_greeting_done: boolean;
};

type AlbumRow = {
  id: string;
  title: string;
  sort_order: number;
};

type PhotoRow = {
  id: string;
  album_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
};

function looksLikeMissingColumnError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('column') && m.includes('does not exist');
}

export default function MinihomeMe() {
  const { d } = useClientLocaleDictionary();
  const labels = d.minihome;
  const router = useRouter();
  const { open: openOverlay } = useMinihomeOverlay();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Row | null>(null);
  const [prof, setProf] = useState<ProfileRow | null>(null);
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [intro, setIntro] = useState('');
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [greetBody, setGreetBody] = useState('');
  const [greetBusy, setGreetBusy] = useState(false);
  const [greetErr, setGreetErr] = useState<string | null>(null);
  const [greetJustDone, setGreetJustDone] = useState(false);
  const [albums, setAlbums] = useState<(AlbumRow & { photos: PhotoRow[] })[]>([]);
  const [albumTitle, setAlbumTitle] = useState('');
  const [photoAlbumId, setPhotoAlbumId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [albumBusy, setAlbumBusy] = useState(false);
  const [albumMsg, setAlbumMsg] = useState<string | null>(null);

  const loadRow = useCallback(async () => {
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      router.replace(`/auth/login?next=${encodeURIComponent('/minihome')}`);
      return null;
    }
    const q = () =>
      sb
        .from('user_minihomes')
        .select('owner_id, public_slug, title, tagline, intro_body, theme, is_public')
        .eq('owner_id', user.id)
        .maybeSingle();

    const qLegacy = () =>
      sb
        .from('user_minihomes')
        .select('owner_id, public_slug, title, tagline, theme, is_public')
        .eq('owner_id', user.id)
        .maybeSingle();

    let { data, error } = await q();
    if (error && looksLikeMissingColumnError(error.message)) {
      // 운영 DB 마이그레이션이 늦게 반영된 경우를 대비한 레거시 폴백
      const legacy = await qLegacy();
      if (!legacy.error && legacy.data) {
        return { ...(legacy.data as Omit<Row, 'intro_body'>), intro_body: null };
      }
      return null;
    }
    if (error) return null;

    if (!data) {
      const { error: rpcErr } = await sb.rpc('ensure_my_minihome');
      if (rpcErr) {
        // RPC가 아직 배포되지 않았어도 기존 row가 있으면 다시 읽어본다.
        const retry = await q();
        if (!retry.error && retry.data) return retry.data as Row;
        if (retry.error && looksLikeMissingColumnError(retry.error.message)) {
          const legacyRetry = await qLegacy();
          if (!legacyRetry.error && legacyRetry.data) {
            return { ...(legacyRetry.data as Omit<Row, 'intro_body'>), intro_body: null };
          }
        }
        return null;
      }
      ({ data, error } = await q());
      if (error && looksLikeMissingColumnError(error.message)) {
        const legacyRetry = await qLegacy();
        if (!legacyRetry.error && legacyRetry.data) {
          return { ...(legacyRetry.data as Omit<Row, 'intro_body'>), intro_body: null };
        }
      }
      if (error || !data) return null;
    }

    return data as Row;
  }, [router]);

  const loadProfile = useCallback(async () => {
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb
      .from('profiles')
      .select('style_score_total, signup_greeting_done')
      .eq('id', user.id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      style_score_total: typeof data.style_score_total === 'number' ? data.style_score_total : 0,
      signup_greeting_done: Boolean(data.signup_greeting_done),
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [data, p] = await Promise.all([loadRow(), loadProfile()]);
      if (cancelled) return;
      if (!data) {
        setRow(null);
        setProf(null);
        setLoading(false);
        return;
      }
      setRow(data);
      setProf(p);
      setTitle(data.title ?? '');
      setTagline(data.tagline ?? '');
      setIntro(data.intro_body ?? '');
      const t = parseTheme(data.theme);
      setAccent(safeAccent(t.accent, DEFAULT_ACCENT));
      setWallpaperUrl(t.wallpaper?.trim() ?? '');
      setIsPublic(data.is_public);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRow, loadProfile]);

  const loadAlbums = useCallback(async () => {
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    const { data: albumRows, error: albumErr } = await sb
      .from('minihome_photo_albums')
      .select('id, title, sort_order')
      .eq('owner_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (albumErr || !albumRows?.length) {
      setAlbums([]);
      setPhotoAlbumId('');
      return;
    }

    const list = albumRows as AlbumRow[];
    const ids = list.map((a) => a.id);
    const { data: photoRows } = await sb
      .from('minihome_photos')
      .select('id, album_id, storage_path, caption, sort_order')
      .in('album_id', ids)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    const photos = (photoRows ?? []) as PhotoRow[];
    const merged = list.map((a) => ({
      ...a,
      photos: photos.filter((p) => p.album_id === a.id),
    }));

    setAlbums(merged);
    setPhotoAlbumId((prev) => (prev && merged.some((m) => m.id === prev) ? prev : merged[0]?.id ?? ''));
  }, []);

  useEffect(() => {
    void loadAlbums();
  }, [loadAlbums]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    setSaveMsg(null);
    setSaveBusy(true);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setSaveBusy(false);
      return;
    }
    const { data: fresh } = await sb.from('user_minihomes').select('theme').eq('owner_id', user.id).maybeSingle();
    const prev = parseTheme(fresh?.theme);
    const nextTheme: Record<string, string> = {
      accent: safeAccent(accent, DEFAULT_ACCENT),
    };
    if (wallpaperUrl.trim()) {
      nextTheme.wallpaper = wallpaperUrl.trim();
    }
    if (prev.minimi) {
      nextTheme.minimi = prev.minimi;
    }
    const { error } = await sb
      .from('user_minihomes')
      .update({
        title: title.trim() || null,
        tagline: tagline.trim() || null,
        intro_body: intro.trim() || null,
        theme: nextTheme,
        is_public: isPublic,
      })
      .eq('owner_id', user.id);
    setSaveBusy(false);
    if (error) {
      setSaveMsg(labels.saveError);
      return;
    }
    setSaveMsg(labels.saved);
    const next = await loadRow();
    if (next) setRow(next);
  }

  async function onGreetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGreetErr(null);
    setGreetBusy(true);
    const sb = createBrowserClient();
    const { error } = await sb.rpc('style_complete_signup_greeting', { p_body: greetBody });
    setGreetBusy(false);
    if (error) {
      setGreetErr(mapStyleRpcError(error.message, labels));
      return;
    }
    setGreetJustDone(true);
    setGreetBody('');
    const p = await loadProfile();
    setProf(p);
    const next = await loadRow();
    if (next) setRow(next);
  }

  async function onAddAlbum(e: React.FormEvent) {
    e.preventDefault();
    const title = albumTitle.trim();
    if (!title) return;
    setAlbumBusy(true);
    setAlbumMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setAlbumBusy(false);
      return;
    }
    const { error } = await sb.from('minihome_photo_albums').insert({
      owner_id: user.id,
      title,
      sort_order: albums.length,
    });
    setAlbumBusy(false);
    if (error) {
      setAlbumMsg(error.message);
      return;
    }
    setAlbumTitle('');
    setAlbumMsg(labels.albumCreateDone);
    await loadAlbums();
  }

  async function onAddPhoto(e: React.FormEvent) {
    e.preventDefault();
    const url = photoUrl.trim();
    if (!photoAlbumId || !url) return;
    setAlbumBusy(true);
    setAlbumMsg(null);
    const target = albums.find((a) => a.id === photoAlbumId);
    const { error } = await createBrowserClient().from('minihome_photos').insert({
      album_id: photoAlbumId,
      storage_path: url,
      caption: photoCaption.trim() || null,
      sort_order: target?.photos.length ?? 0,
    });
    setAlbumBusy(false);
    if (error) {
      setAlbumMsg(error.message);
      return;
    }
    setPhotoUrl('');
    setPhotoCaption('');
    setAlbumMsg(labels.photoAddDone);
    await loadAlbums();
  }

  async function onDeletePhoto(photoId: string) {
    if (!confirm(labels.photoDeleteAsk)) return;
    setAlbumBusy(true);
    setAlbumMsg(null);
    const { error } = await createBrowserClient().from('minihome_photos').delete().eq('id', photoId);
    setAlbumBusy(false);
    if (error) {
      setAlbumMsg(error.message);
      return;
    }
    setAlbumMsg(labels.photoDeleteDone);
    await loadAlbums();
  }

  async function onDeleteAlbum(albumId: string) {
    if (!confirm(labels.albumDeleteAsk)) return;
    setAlbumBusy(true);
    setAlbumMsg(null);
    const { error } = await createBrowserClient().from('minihome_photo_albums').delete().eq('id', albumId);
    setAlbumBusy(false);
    if (error) {
      setAlbumMsg(error.message);
      return;
    }
    setAlbumMsg(labels.albumDeleteDone);
    await loadAlbums();
  }

  if (loading) {
    return (
      <div className="page-body board-page">
        <p style={{ margin: 0, color: 'var(--tj-muted)' }}>{labels.loadingMark}</p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="page-body board-page">
        <p style={{ color: '#be185d', fontSize: '0.9rem' }}>{labels.notProvisioned}</p>
        <Link href="/" style={{ color: 'var(--tj-link)' }}>
          ← home
        </Link>
      </div>
    );
  }

  const score = prof?.style_score_total ?? null;
  const showGreet = prof && !prof.signup_greeting_done;

  return (
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{labels.pageTitle}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {score !== null ? (
            <span className="minihome-style-score-pill" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
              {labels.styleScoreLabel} {score}
            </span>
          ) : null}
          <Link href="/minihome/shop" className="board-form__submit" style={{ textAlign: 'center' }}>
            {labels.styleShopNav}
          </Link>
          <button
            type="button"
            className="board-form__submit"
            onClick={() => openOverlay(row.public_slug)}
          >
            {labels.previewOverlay}
          </button>
          <Link
            href={`/minihome/${row.public_slug}`}
            className="board-form__submit"
            style={{ textAlign: 'center', background: '#fff', color: 'var(--tj-ink)', border: '1px solid var(--tj-line)' }}
          >
            {labels.publicPage}
          </Link>
        </div>
      </div>

      <p style={{ margin: '0 0 18px', lineHeight: 1.55, color: 'var(--tj-muted)', fontSize: '0.9rem' }}>
        {labels.yourSpace}
      </p>

      {showGreet ? (
        <div className="card minihome-greet-card" style={{ padding: 18, marginBottom: 22 }}>
          <h2 className="minihome-edit-form__h" style={{ marginTop: 0 }}>
            {labels.greetCardTitle}
          </h2>
          <p style={{ margin: '0 0 12px', fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--tj-muted)' }}>
            {labels.greetCardLead}
          </p>
          <form className="board-form" onSubmit={(e) => void onGreetSubmit(e)} style={{ gap: 10 }}>
            <textarea
              value={greetBody}
              onChange={(e) => setGreetBody(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={labels.greetPlaceholder}
            />
            {greetErr ? <p className="auth-inline-error">{greetErr}</p> : null}
            <button type="submit" className="board-form__submit" disabled={greetBusy}>
              {greetBusy ? labels.greetSubmitting : labels.greetSubmit}
            </button>
          </form>
        </div>
      ) : greetJustDone ? (
        <div className="card" style={{ padding: 14, marginBottom: 22, background: 'rgba(237, 233, 254, 0.45)' }}>
          <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5 }}>
            <strong>{labels.greetDone}</strong> {labels.greetThanks}
          </p>
          <Link href="/minihome/shop" style={{ display: 'inline-block', marginTop: 10, color: 'var(--tj-link)' }}>
            {labels.styleShopNav} →
          </Link>
        </div>
      ) : null}

      <form className="board-form minihome-edit-form" onSubmit={(e) => void onSave(e)}>
        <h2 className="minihome-edit-form__h">{labels.editSectionTitle}</h2>
        <p className="minihome-edit-form__hint">{labels.editHint}</p>

        <label htmlFor="mh-title">{labels.fieldTitle}</label>
        <input id="mh-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />

        <label htmlFor="mh-tag">{labels.fieldTagline}</label>
        <input id="mh-tag" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={200} />

        <label htmlFor="mh-intro">{labels.fieldIntro}</label>
        <textarea
          id="mh-intro"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={8}
          maxLength={6000}
          placeholder=""
        />
        <p className="auth-field-hint">{labels.fieldIntroHint}</p>

        <label htmlFor="mh-accent">{labels.fieldAccent}</label>
        <input id="mh-accent" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />

        <label htmlFor="mh-wall">{labels.fieldWallpaper}</label>
        <input
          id="mh-wall"
          type="url"
          value={wallpaperUrl}
          onChange={(e) => setWallpaperUrl(e.target.value)}
          placeholder="https://"
          autoComplete="off"
        />
        <p className="auth-field-hint">{labels.fieldWallpaperHint}</p>

        <label className="minihome-edit-form__check">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          {labels.fieldPublic}
        </label>

        <p className="auth-field-hint">{labels.layoutHint}</p>

        <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--tj-muted)' }}>
          {labels.slugLabel}: <code>/minihome/{row.public_slug}</code>
        </p>

        {saveMsg ? (
          <p className={saveMsg === labels.saved ? 'auth-field-hint' : 'auth-inline-error'} style={{ marginBottom: 8 }}>
            {saveMsg}
          </p>
        ) : null}

        <button type="submit" className="board-form__submit" disabled={saveBusy}>
          {saveBusy ? labels.saving : labels.save}
        </button>
      </form>

      <div className="card" style={{ padding: 18, marginTop: 22 }}>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--tj-muted)' }}>
          {labels.previewPanelsHint}
        </p>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 22 }}>
        <h2 className="minihome-edit-form__h" style={{ marginTop: 0 }}>
          {labels.albumManagerTitle}
        </h2>
        <p className="minihome-edit-form__hint">{labels.albumManagerHint}</p>
        {albumMsg ? (
          <p className={albumMsg.includes('Done') || albumMsg.includes('완료') ? 'auth-field-hint' : 'auth-inline-error'}>
            {albumMsg}
          </p>
        ) : null}

        <form className="board-form" onSubmit={(e) => void onAddAlbum(e)} style={{ gap: 10 }}>
          <label htmlFor="mh-album-title">{labels.albumTitleLabel}</label>
          <input
            id="mh-album-title"
            value={albumTitle}
            onChange={(e) => setAlbumTitle(e.target.value)}
            maxLength={80}
            placeholder={labels.albumTitlePlaceholder}
          />
          <button type="submit" className="board-form__submit" disabled={albumBusy}>
            {labels.albumCreateButton}
          </button>
        </form>

        <form className="board-form" onSubmit={(e) => void onAddPhoto(e)} style={{ gap: 10, marginTop: 16 }}>
          <label htmlFor="mh-photo-album">{labels.photoAlbumLabel}</label>
          <select
            id="mh-photo-album"
            value={photoAlbumId}
            onChange={(e) => setPhotoAlbumId(e.target.value)}
            disabled={albumBusy || albums.length === 0}
          >
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <label htmlFor="mh-photo-url">{labels.photoUrlLabel}</label>
          <input
            id="mh-photo-url"
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://"
          />
          <label htmlFor="mh-photo-caption">{labels.photoCaptionLabel}</label>
          <input
            id="mh-photo-caption"
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
            maxLength={200}
            placeholder={labels.photoCaptionPlaceholder}
          />
          <button type="submit" className="board-form__submit" disabled={albumBusy || !albums.length}>
            {labels.photoAddButton}
          </button>
        </form>

        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          {albums.length === 0 ? (
            <p className="auth-field-hint">{labels.albumEmpty}</p>
          ) : (
            albums.map((album) => (
              <section key={album.id} style={{ border: '1px solid var(--tj-line)', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong>{album.title}</strong>
                  <button type="button" className="board-form__submit" onClick={() => void onDeleteAlbum(album.id)} disabled={albumBusy}>
                    {labels.albumDeleteButton}
                  </button>
                </div>
                {album.photos.length === 0 ? (
                  <p className="auth-field-hint" style={{ marginTop: 8 }}>
                    {labels.photoEmpty}
                  </p>
                ) : (
                  <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                    {album.photos.map((p) => (
                      <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, wordBreak: 'break-all' }}>{p.storage_path}</div>
                          {p.caption ? <div style={{ fontSize: 12, color: 'var(--tj-muted)' }}>{p.caption}</div> : null}
                        </div>
                        <button type="button" className="board-form__submit" onClick={() => void onDeletePhoto(p.id)} disabled={albumBusy}>
                          {labels.photoDeleteButton}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
