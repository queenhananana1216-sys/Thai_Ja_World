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

type EntryKind = 'open' | 'ilchon';

type GbRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  entry_kind: EntryKind;
  is_hidden: boolean;
};

type PhotoRow = {
  id: string;
  album_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
};

type Props = {
  data: MinihomePublicRow;
  labels: Dictionary['minihome'];
  ilchon: Dictionary['ilchon'];
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

type IlchonMode = 'loading' | 'hidden' | 'anon' | 'linked' | 'out' | 'in' | 'ask';

function mapIlchonRpc(raw: string, L: Dictionary['ilchon']): string {
  const m = raw.toLowerCase();
  if (m.includes('pending_request_exists')) return L.errorPendingExists;
  if (m.includes('already_ilchon')) return L.errorAlreadyIlchon;
  if (m.includes('not_authenticated')) return L.errorNotAuth;
  if (m.includes('cannot_request_self')) return L.errorSelf;
  return L.errorGeneric;
}

function extFromMime(ct: string): string {
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  return 'bin';
}

export default function MinihomeRoomView({
  data,
  labels,
  ilchon,
  navCommunity,
  variant,
  onClose,
}: Props) {
  const theme = parseTheme(data.theme);
  const accent = safeAccent(theme.accent, FALLBACK_ACCENT);
  const modules = parseLayoutModules(data.layout_modules);
  const wallpaper = theme.wallpaper?.trim();
  const minimi = theme.minimi?.trim();

  const [winGuest, setWinGuest] = useState(false);
  const [winVisitor, setWinVisitor] = useState(false);
  const [winPhotos, setWinPhotos] = useState(false);
  const [gbRows, setGbRows] = useState<GbRow[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [gbLoading, setGbLoading] = useState(false);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [ilchonBody, setIlchonBody] = useState('');
  const [openBody, setOpenBody] = useState('');
  const [postBusy, setPostBusy] = useState<'ilchon' | 'open' | null>(null);
  const [postErr, setPostErr] = useState<string | null>(null);
  const [modBusy, setModBusy] = useState<string | null>(null);

  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photoUploadBusy, setPhotoUploadBusy] = useState(false);

  const [ilchonMode, setIlchonMode] = useState<IlchonMode>('loading');
  const [ilchonToast, setIlchonToast] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [reqMessage, setReqMessage] = useState('');
  const [reqNick, setReqNick] = useState('');
  const [reqBusy, setReqBusy] = useState(false);

  const isOwner = viewerId !== null && viewerId === data.owner_id;

  const ilchonRows = useMemo(
    () => (gbRows ?? []).filter((r) => r.entry_kind === 'ilchon'),
    [gbRows],
  );
  const openRows = useMemo(() => (gbRows ?? []).filter((r) => r.entry_kind === 'open'), [gbRows]);

  const loadGuestbook = useCallback(async () => {
    if (!data.owner_id) return;
    setGbLoading(true);
    setPostErr(null);
    const sb = createBrowserClient();
    const { data: rows, error } = await sb
      .from('minihome_guestbook_entries')
      .select('id, body, created_at, author_id, entry_kind, is_hidden')
      .eq('minihome_owner_id', data.owner_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !rows) {
      setGbRows([]);
      setNames({});
      setGbLoading(false);
      return;
    }

    const list: GbRow[] = rows.map((r) => ({
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      author_id: r.author_id,
      is_hidden: r.is_hidden,
      entry_kind: (r.entry_kind === 'ilchon' ? 'ilchon' : 'open') as EntryKind,
    }));
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

  const loadPhotos = useCallback(async () => {
    if (!data.owner_id) return;
    setPhotosLoading(true);
    const sb = createBrowserClient();
    const { data: albums, error: aErr } = await sb
      .from('minihome_photo_albums')
      .select('id')
      .eq('owner_id', data.owner_id)
      .order('sort_order', { ascending: true });
    if (aErr || !albums?.length) {
      setPhotos([]);
      setPhotosLoading(false);
      return;
    }
    const ids = albums.map((a) => a.id as string);
    const { data: ph, error: pErr } = await sb
      .from('minihome_photos')
      .select('id, album_id, storage_path, caption, sort_order')
      .in('album_id', ids)
      .order('sort_order', { ascending: true });
    if (pErr || !ph) {
      setPhotos([]);
    } else {
      setPhotos(ph as PhotoRow[]);
    }
    setPhotosLoading(false);
  }, [data.owner_id]);

  useEffect(() => {
    const sb = createBrowserClient();
    void sb.auth.getUser().then(({ data: { user } }) => {
      setViewerId(user?.id ?? null);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_e, session) => {
      setViewerId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!winGuest && !winVisitor) return;
    void loadGuestbook();
  }, [winGuest, winVisitor, loadGuestbook]);

  useEffect(() => {
    if (!winPhotos) return;
    void loadPhotos();
  }, [winPhotos, loadPhotos]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!data.owner_id) {
        setIlchonMode('hidden');
        return;
      }
      setIlchonMode('loading');
      const sb = createBrowserClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setIlchonMode('anon');
        return;
      }
      if (user.id === data.owner_id) {
        setIlchonMode('hidden');
        return;
      }
      const [link, outReq] = await Promise.all([
        sb
          .from('ilchon_links')
          .select('peer_id')
          .eq('user_id', user.id)
          .eq('peer_id', data.owner_id)
          .maybeSingle(),
        sb
          .from('ilchon_requests')
          .select('id')
          .eq('from_user_id', user.id)
          .eq('to_user_id', data.owner_id)
          .eq('status', 'pending')
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (link.data) {
        setIlchonMode('linked');
        return;
      }
      if (outReq.data) {
        setIlchonMode('out');
        return;
      }
      const { data: inReq } = await sb
        .from('ilchon_requests')
        .select('id')
        .eq('from_user_id', data.owner_id)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      if (cancelled) return;
      if (inReq) setIlchonMode('in');
      else setIlchonMode('ask');
    })();
    return () => {
      cancelled = true;
    };
  }, [data.owner_id]);

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

  const loginNext = `/auth/login?next=${encodeURIComponent(`/minihome/${data.public_slug}`)}`;

  async function submitIlchonRequest() {
    if (!data.owner_id || reqBusy) return;
    setReqBusy(true);
    setIlchonToast(null);
    const sb = createBrowserClient();
    const msg = reqMessage.trim();
    const nick = reqNick.trim();
    const { error } = await sb.rpc('ilchon_send_request', {
      p_to_user_id: data.owner_id,
      p_message: msg.length ? msg : null,
      p_proposed_nickname: nick.length ? nick : null,
    });
    setReqBusy(false);
    if (error) {
      setIlchonToast(mapIlchonRpc(error.message ?? '', ilchon));
      return;
    }
    setRequestOpen(false);
    setReqMessage('');
    setReqNick('');
    setIlchonMode('out');
  }

  async function submitGuestbook(kind: EntryKind) {
    const body = (kind === 'ilchon' ? ilchonBody : openBody).trim();
    if (body.length < 2) {
      setPostErr(labels.cyBodyMinLength);
      return;
    }
    if (!data.owner_id || !viewerId) return;
    setPostBusy(kind);
    setPostErr(null);
    const sb = createBrowserClient();
    const { error } = await sb.from('minihome_guestbook_entries').insert({
      minihome_owner_id: data.owner_id,
      author_id: viewerId,
      body,
      entry_kind: kind,
    });
    setPostBusy(null);
    if (error) {
      setPostErr(error.message);
      return;
    }
    if (kind === 'ilchon') setIlchonBody('');
    else setOpenBody('');
    await loadGuestbook();
  }

  async function toggleHidden(row: GbRow) {
    if (!isOwner) return;
    setModBusy(row.id);
    setPostErr(null);
    const sb = createBrowserClient();
    const { error } = await sb
      .from('minihome_guestbook_entries')
      .update({ is_hidden: !row.is_hidden })
      .eq('id', row.id)
      .eq('minihome_owner_id', data.owner_id);
    setModBusy(null);
    if (error) setPostErr(error.message);
    else await loadGuestbook();
  }

  async function deleteEntry(row: GbRow) {
    if (!isOwner || !confirm(labels.cyDeleteEntryConfirm)) return;
    setModBusy(row.id);
    setPostErr(null);
    const sb = createBrowserClient();
    const { error } = await sb
      .from('minihome_guestbook_entries')
      .delete()
      .eq('id', row.id)
      .eq('minihome_owner_id', data.owner_id);
    setModBusy(null);
    if (error) setPostErr(error.message);
    else await loadGuestbook();
  }

  async function ensureAlbumId(sb: ReturnType<typeof createBrowserClient>): Promise<string | null> {
    const { data: rows } = await sb
      .from('minihome_photo_albums')
      .select('id')
      .eq('owner_id', data.owner_id)
      .order('sort_order', { ascending: true })
      .limit(1);
    const first = rows?.[0]?.id as string | undefined;
    if (first) return first;
    const { data: ins, error } = await sb
      .from('minihome_photo_albums')
      .insert({ owner_id: data.owner_id, title: labels.cyPhotosDefaultAlbum, sort_order: 0 })
      .select('id')
      .single();
    if (error || !ins?.id) return null;
    return ins.id as string;
  }

  async function onPickPhotos(files: FileList | null) {
    if (!files?.length || !isOwner) return;
    setPhotoUploadBusy(true);
    setPostErr(null);
    const sb = createBrowserClient();
    const albumId = await ensureAlbumId(sb);
    if (!albumId) {
      setPostErr(labels.cyPhotosAlbumCreateError);
      setPhotoUploadBusy(false);
      return;
    }
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;
      const ct = file.type || '';
      if (!allowed.has(ct)) {
        setPostErr(labels.cyPhotosTypeError);
        setPhotoUploadBusy(false);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setPostErr(labels.cyPhotosSizeError);
        setPhotoUploadBusy(false);
        return;
      }
      const path = `${data.owner_id}/${crypto.randomUUID()}.${extFromMime(ct)}`;
      const { error: upErr } = await sb.storage.from('minihome-photos').upload(path, file, {
        contentType: ct,
        upsert: false,
      });
      if (upErr) {
        setPostErr(upErr.message);
        setPhotoUploadBusy(false);
        return;
      }
      const { error: insErr } = await sb.from('minihome_photos').insert({
        album_id: albumId,
        storage_path: path,
        caption: null,
        sort_order: Date.now() % 100000,
      });
      if (insErr) {
        setPostErr(insErr.message);
        setPhotoUploadBusy(false);
        return;
      }
    }
    setPhotoUploadBusy(false);
    await loadPhotos();
  }

  async function deletePhoto(p: PhotoRow) {
    if (!isOwner || !confirm(labels.cyDeletePhotoConfirm)) return;
    setPostErr(null);
    const sb = createBrowserClient();
    const { error: rmErr } = await sb.storage.from('minihome-photos').remove([p.storage_path]);
    if (rmErr) setPostErr(rmErr.message);
    await sb.from('minihome_photos').delete().eq('id', p.id);
    await loadPhotos();
  }

  function publicUrl(path: string): string {
    const sb = createBrowserClient();
    const { data } = sb.storage.from('minihome-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  function renderGbList(rows: GbRow[], chronological: boolean) {
    const ordered = chronological ? rows : [...rows].reverse();
    return (
      <ul className="minihome-cy-win__list">
        {ordered.map((r) => (
          <li
            key={r.id}
            className="minihome-cy-win__item"
            style={{ opacity: r.is_hidden ? 0.72 : 1 }}
          >
            <div className="minihome-cy-win__meta">
              {names[r.author_id] ?? 'member'} · {formatDate(r.created_at)}
              {r.is_hidden ? (
                <span style={{ marginLeft: 8, fontSize: '0.72rem', fontWeight: 700, color: '#b45309' }}>
                  [{labels.cyHiddenBadge}]
                </span>
              ) : null}
            </div>
            <div className="minihome-cy-win__text">{r.body}</div>
            {isOwner ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                <button
                  type="button"
                  className="ilchon-btn ilchon-btn--ghost"
                  style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                  disabled={modBusy === r.id}
                  onClick={() => void toggleHidden(r)}
                >
                  {modBusy === r.id ? '…' : r.is_hidden ? labels.cyModerationUnhide : labels.cyModerationHide}
                </button>
                <button
                  type="button"
                  className="ilchon-btn ilchon-btn--ghost"
                  style={{ fontSize: '0.72rem', padding: '4px 8px', color: '#b91c1c' }}
                  disabled={modBusy === r.id}
                  onClick={() => void deleteEntry(r)}
                >
                  {labels.cyModerationDelete}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  const showIlchonComposer =
    viewerId && viewerId !== data.owner_id && ilchonMode === 'linked';
  const showOpenComposer = viewerId && viewerId !== data.owner_id;

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
            {minimi ? (
              <div className="minihome-room__minimi" aria-hidden>
                {minimi}
              </div>
            ) : null}
          </header>

          {showIntro ? (
            <section className="minihome-room__section">
              <h2 className="minihome-room__section-title">{labels.sectionIntro}</h2>
              <div className="minihome-room__intro-body">{data.intro_body}</div>
            </section>
          ) : (
            <p className="minihome-cy-stage__hint">{labels.cyIntroEmpty}</p>
          )}

          {!modules.includes('guestbook') ? (
            <p className="minihome-room__soon" style={{ marginTop: 10 }}>
              {labels.guestbookLocked}
            </p>
          ) : null}

          {ilchonMode !== 'loading' && ilchonMode !== 'hidden' ? (
            <div className="minihome-room__ilchon">
              {ilchonToast ? <p className="minihome-room__ilchon-note">{ilchonToast}</p> : null}
              {ilchonMode === 'anon' ? (
                <>
                  <p className="minihome-room__ilchon-note">{ilchon.needLogin}</p>
                  <Link className="ilchon-btn" href={loginNext}>
                    {ilchon.goLogin}
                  </Link>
                </>
              ) : null}
              {ilchonMode === 'linked' ? (
                <p className="minihome-room__ilchon-note">{ilchon.alreadyIlchon}</p>
              ) : null}
              {ilchonMode === 'out' ? (
                <>
                  <p className="minihome-room__ilchon-note">{ilchon.pendingOutbound}</p>
                  <Link className="ilchon-btn ilchon-btn--ghost" href="/ilchon">
                    {ilchon.openInbox}
                  </Link>
                </>
              ) : null}
              {ilchonMode === 'in' ? (
                <>
                  <p className="minihome-room__ilchon-note">{ilchon.pendingInbound}</p>
                  <Link className="ilchon-btn" href="/ilchon">
                    {ilchon.openInbox}
                  </Link>
                </>
              ) : null}
              {ilchonMode === 'ask' ? (
                <button type="button" className="ilchon-btn" onClick={() => setRequestOpen(true)}>
                  {ilchon.requestButton}
                </button>
              ) : null}
            </div>
          ) : null}

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
          {postErr && winGuest ? (
            <p className="minihome-cy-win__muted" style={{ color: '#b91c1c', marginBottom: 8 }}>
              {postErr}
            </p>
          ) : null}
          <p className="minihome-cy-win__muted" style={{ fontSize: '0.78rem', marginBottom: 10 }}>
            {labels.cyIlchonWriteHint}
          </p>
          {gbLoading ? (
            <p className="minihome-cy-win__muted">{labels.loadingMark}</p>
          ) : ilchonRows.length === 0 ? (
            <p className="minihome-cy-win__muted">{labels.cyGuestbookEmpty}</p>
          ) : (
            renderGbList(ilchonRows, true)
          )}
          {showIlchonComposer ? (
            <div style={{ marginTop: 14, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 12 }}>
              <textarea
                value={ilchonBody}
                onChange={(e) => setIlchonBody(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={labels.cyGuestbookWriteSoon}
                style={{ width: '100%', fontSize: '0.88rem', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <button
                type="button"
                className="ilchon-btn"
                style={{ marginTop: 8 }}
                disabled={postBusy === 'ilchon'}
                onClick={() => void submitGuestbook('ilchon')}
              >
                {postBusy === 'ilchon' ? labels.cyPostSubmitting : labels.cyPostSubmit}
              </button>
            </div>
          ) : viewerId === null ? (
            <p className="minihome-cy-win__soon" style={{ marginTop: 12 }}>
              <Link href={loginNext}>{ilchon.goLogin}</Link>
            </p>
          ) : isOwner ? (
            <p className="minihome-cy-win__muted" style={{ marginTop: 12, fontSize: '0.78rem' }}>
              {labels.cyIlchonWriteHint}
            </p>
          ) : ilchonMode === 'linked' ? null : (
            <p className="minihome-cy-win__soon" style={{ marginTop: 12 }}>
              {labels.cyGuestbookWriteSoon}
            </p>
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
          {postErr && winVisitor ? (
            <p className="minihome-cy-win__muted" style={{ color: '#b91c1c', marginBottom: 8 }}>
              {postErr}
            </p>
          ) : null}
          <p className="minihome-cy-win__muted" style={{ fontSize: '0.78rem', marginBottom: 10 }}>
            {labels.cyOpenWriteHint}
          </p>
          {gbLoading ? (
            <p className="minihome-cy-win__muted">{labels.loadingMark}</p>
          ) : openRows.length === 0 ? (
            <p className="minihome-cy-win__muted">{labels.cyVisitorEmpty}</p>
          ) : (
            renderGbList(openRows, false)
          )}
          {showOpenComposer ? (
            <div style={{ marginTop: 14, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 12 }}>
              <textarea
                value={openBody}
                onChange={(e) => setOpenBody(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={labels.cyVisitorWriteSoon}
                style={{ width: '100%', fontSize: '0.88rem', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <button
                type="button"
                className="ilchon-btn"
                style={{ marginTop: 8 }}
                disabled={postBusy === 'open'}
                onClick={() => void submitGuestbook('open')}
              >
                {postBusy === 'open' ? labels.cyPostSubmitting : labels.cyPostSubmit}
              </button>
            </div>
          ) : viewerId === null ? (
            <p className="minihome-cy-win__soon" style={{ marginTop: 12 }}>
              <Link href={loginNext}>{ilchon.goLogin}</Link>
            </p>
          ) : isOwner ? (
            <p className="minihome-cy-win__muted" style={{ marginTop: 12, fontSize: '0.78rem' }}>
              {labels.cyOwnerVisitorHint}
            </p>
          ) : null}
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
          {postErr && winPhotos ? (
            <p className="minihome-cy-win__muted" style={{ color: '#b91c1c', marginBottom: 8 }}>
              {postErr}
            </p>
          ) : null}
          {photosLoading ? (
            <p className="minihome-cy-win__muted">{labels.loadingMark}</p>
          ) : photos.length === 0 ? (
            <p className="minihome-cy-win__muted">{labels.cyPhotosEmpty}</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
                gap: 8,
              }}
            >
              {photos.map((p) => (
                <div key={p.id} style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicUrl(p.storage_path)}
                    alt=""
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6 }}
                  />
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => void deletePhoto(p)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: 'none',
                        background: 'rgba(0,0,0,0.55)',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      {labels.cyPhotosDelete}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {isOwner ? (
            <div style={{ marginTop: 14 }}>
              <label
                style={{
                  display: 'inline-block',
                  padding: '8px 12px',
                  background: `${accent}22`,
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: photoUploadBusy ? 'wait' : 'pointer',
                }}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  style={{ display: 'none' }}
                  disabled={photoUploadBusy}
                  onChange={(e) => void onPickPhotos(e.target.files)}
                />
                {photoUploadBusy ? labels.cyPhotosUploading : labels.cyPhotosUpload}
              </label>
            </div>
          ) : (
            <p className="minihome-cy-win__muted" style={{ marginTop: 12, fontSize: '0.78rem' }}>
              {labels.cyPhotosVisitorHint}
            </p>
          )}
        </CyWindow>
      </div>

      {requestOpen ? (
        <div
          className="minihome-ilchon-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="minihome-ilchon-req-title"
        >
          <div className="minihome-ilchon-modal__card card">
            <h3 id="minihome-ilchon-req-title" className="minihome-ilchon-modal__title">
              {ilchon.requestTitle}
            </h3>
            <label className="minihome-ilchon-modal__field">
              <span>{ilchon.messageLabel}</span>
              <input
                type="text"
                maxLength={500}
                value={reqMessage}
                onChange={(e) => setReqMessage(e.target.value)}
                placeholder={ilchon.messagePlaceholder}
              />
            </label>
            <label className="minihome-ilchon-modal__field">
              <span>{ilchon.proposedNickLabel}</span>
              <input
                type="text"
                maxLength={40}
                value={reqNick}
                onChange={(e) => setReqNick(e.target.value)}
                placeholder={ilchon.proposedNickHint}
              />
            </label>
            <div className="minihome-ilchon-modal__actions">
              <button
                type="button"
                className="ilchon-btn"
                disabled={reqBusy}
                onClick={() => void submitIlchonRequest()}
              >
                {reqBusy ? ilchon.sending : ilchon.sendRequest}
              </button>
              <button
                type="button"
                className="ilchon-btn ilchon-btn--ghost"
                disabled={reqBusy}
                onClick={() => setRequestOpen(false)}
              >
                {ilchon.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
