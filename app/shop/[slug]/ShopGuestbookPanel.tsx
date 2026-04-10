'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatDate';

type EntryKind = 'open' | 'ilchon';

type GbRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  entry_kind: EntryKind;
  is_hidden: boolean;
  owner_reply: string | null;
  owner_reply_at: string | null;
};

type IlchonMode = 'loading' | 'noop' | 'anon' | 'linked' | 'out' | 'in' | 'ask';

export type ShopGuestbookPanelProps = {
  spotId: string;
  ownerProfileId: string | null;
  isPublished: boolean;
  minihomeGuestbookEnabled: boolean;
  publicSlug: string;
};

export default function ShopGuestbookPanel({
  spotId,
  ownerProfileId,
  isPublished,
  minihomeGuestbookEnabled,
  publicSlug,
}: ShopGuestbookPanelProps) {
  const { d } = useClientLocaleDictionary();
  const L = d.localShop;
  const ilchon = d.ilchon;

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [rows, setRows] = useState<GbRow[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [openBody, setOpenBody] = useState('');
  const [ilchonBody, setIlchonBody] = useState('');
  const [postBusy, setPostBusy] = useState<'open' | 'ilchon' | null>(null);
  const [postErr, setPostErr] = useState<string | null>(null);
  const [modBusy, setModBusy] = useState<string | null>(null);
  const [ilchonMode, setIlchonMode] = useState<IlchonMode>('loading');

  const isOwner = Boolean(viewerId && ownerProfileId && viewerId === ownerProfileId);
  const loginNext = `/auth/login?next=${encodeURIComponent(`/shop/${publicSlug}`)}`;

  const load = useCallback(async () => {
    if (!spotId) return;
    setLoading(true);
    setPostErr(null);
    const sb = createBrowserClient();
    const { data, error } = await sb
      .from('local_shop_guestbook_entries')
      .select('id, body, created_at, author_id, entry_kind, is_hidden, owner_reply, owner_reply_at')
      .eq('local_spot_id', spotId)
      .order('created_at', { ascending: false })
      .limit(120);

    if (error || !data) {
      setRows([]);
      setNames({});
      setLoading(false);
      return;
    }

    const list: GbRow[] = data.map((r) => ({
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      author_id: r.author_id,
      is_hidden: r.is_hidden,
      entry_kind: r.entry_kind === 'ilchon' ? 'ilchon' : 'open',
      owner_reply: typeof r.owner_reply === 'string' ? r.owner_reply : null,
      owner_reply_at: typeof r.owner_reply_at === 'string' ? r.owner_reply_at : null,
    }));
    setRows(list);
    const ids = [...new Set(list.map((r) => r.author_id))];
    if (ids.length === 0) {
      setNames({});
      setLoading(false);
      return;
    }
    const { data: profs } = await sb.from('profiles').select('id, display_name').in('id', ids);
    const map: Record<string, string> = {};
    for (const p of profs ?? []) {
      map[p.id as string] = ((p.display_name as string) || '').trim() || 'member';
    }
    setNames(map);
    setLoading(false);
  }, [spotId]);

  useEffect(() => {
    const sb = createBrowserClient();
    void sb.auth.getUser().then(({ data: { user } }) => setViewerId(user?.id ?? null));
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_e, session) => {
      setViewerId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!minihomeGuestbookEnabled && !isOwner) return;
    void load();
  }, [load, minihomeGuestbookEnabled, isOwner]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ownerProfileId) {
        setIlchonMode('noop');
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
      if (user.id === ownerProfileId) {
        setIlchonMode('noop');
        return;
      }
      const [link, outReq] = await Promise.all([
        sb
          .from('ilchon_links')
          .select('peer_id')
          .eq('user_id', user.id)
          .eq('peer_id', ownerProfileId)
          .maybeSingle(),
        sb
          .from('ilchon_requests')
          .select('id')
          .eq('from_user_id', user.id)
          .eq('to_user_id', ownerProfileId)
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
        .eq('from_user_id', ownerProfileId)
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
  }, [ownerProfileId, viewerId]);

  async function submit(kind: EntryKind) {
    const body = (kind === 'ilchon' ? ilchonBody : openBody).trim();
    if (body.length < 2) {
      setPostErr(L.bodyTooShort);
      return;
    }
    if (!viewerId) return;
    setPostBusy(kind);
    setPostErr(null);
    const sb = createBrowserClient();
    const { error } = await sb.from('local_shop_guestbook_entries').insert({
      local_spot_id: spotId,
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
    await load();
  }

  async function toggleHidden(row: GbRow) {
    if (!isOwner) return;
    setModBusy(row.id);
    setPostErr(null);
    const sb = createBrowserClient();
    const { error } = await sb
      .from('local_shop_guestbook_entries')
      .update({ is_hidden: !row.is_hidden })
      .eq('id', row.id)
      .eq('local_spot_id', spotId);
    setModBusy(null);
    if (error) setPostErr(error.message);
    else await load();
  }

  async function deleteEntry(row: GbRow) {
    if (!isOwner || !confirm(L.confirmDelete)) return;
    setModBusy(row.id);
    setPostErr(null);
    const sb = createBrowserClient();
    const { error } = await sb.from('local_shop_guestbook_entries').delete().eq('id', row.id).eq('local_spot_id', spotId);
    setModBusy(null);
    if (error) setPostErr(error.message);
    else await load();
  }

  if (!minihomeGuestbookEnabled && !isOwner) {
    return null;
  }

  const ilchonRows = (rows ?? []).filter((r) => r.entry_kind === 'ilchon');
  const openRows = (rows ?? []).filter((r) => r.entry_kind === 'open');
  const openChrono = [...openRows].reverse();

  const showOpenComposer =
    Boolean(minihomeGuestbookEnabled && isPublished && viewerId && !isOwner);
  const showIlchonComposer =
    Boolean(
      minihomeGuestbookEnabled &&
        isPublished &&
        viewerId &&
        !isOwner &&
        ownerProfileId &&
        ilchonMode === 'linked',
    );

  const sectionStyle = {
    marginTop: 22,
    paddingTop: 18,
    borderTop: '1px solid rgba(255,255,255,0.12)',
  } as const;

  function renderList(items: GbRow[], chronological: boolean) {
    const ordered = chronological ? items : [...items].reverse();
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
        {ordered.map((r) => (
          <li
            key={r.id}
            style={{
              padding: '10px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              opacity: r.is_hidden ? 0.75 : 1,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {names[r.author_id] ?? 'member'} · {formatDate(r.created_at)}
              {r.is_hidden ? (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>
                  [{L.hiddenBadge}]
                </span>
              ) : null}
            </div>
            <div style={{ marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{r.body}</div>
            {r.owner_reply?.trim() ? (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(99,102,241,0.16)',
                  border: '1px solid rgba(165,180,252,0.28)',
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 4 }}>
                  사장님 답글 · {formatDate(r.owner_reply_at)}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{r.owner_reply}</div>
              </div>
            ) : null}
            {isOwner ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => void toggleHidden(r)}
                  disabled={modBusy === r.id}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  {modBusy === r.id ? '…' : r.is_hidden ? L.unhide : L.hide}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteEntry(r)}
                  disabled={modBusy === r.id}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'rgba(220,38,38,0.25)',
                    color: '#fecaca',
                    cursor: 'pointer',
                  }}
                >
                  {L.delete}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div style={sectionStyle}>
      {!minihomeGuestbookEnabled && isOwner ? (
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#fbbf24', lineHeight: 1.5 }}>{L.ownerPaused}</p>
      ) : null}

      {postErr ? (
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#fecaca' }}>{postErr}</p>
      ) : null}

      <div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '0.02em' }}>{L.sectionIlchon}</h2>
        <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.85 }}>{L.hintIlchon}</p>
        {!ownerProfileId ? (
          <p style={{ margin: '10px 0 0', fontSize: 12, opacity: 0.75 }}>{L.noOwnerForIlchon}</p>
        ) : loading && rows === null ? (
          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>{L.loading}</p>
        ) : ilchonRows.length === 0 ? (
          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>{L.emptyIlchon}</p>
        ) : (
          renderList(ilchonRows, true)
        )}

        {showIlchonComposer ? (
          <div style={{ marginTop: 12 }}>
            <textarea
              value={ilchonBody}
              onChange={(e) => setIlchonBody(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={L.placeholderIlchon}
              style={{
                width: '100%',
                fontSize: 14,
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.25)',
                color: '#f8fafc',
              }}
            />
            <button
              type="button"
              onClick={() => void submit('ilchon')}
              disabled={postBusy === 'ilchon'}
              style={{
                marginTop: 8,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#7c3aed',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: postBusy === 'ilchon' ? 'wait' : 'pointer',
              }}
            >
              {postBusy === 'ilchon' ? L.submitting : L.submit}
            </button>
          </div>
        ) : viewerId === null && minihomeGuestbookEnabled && isPublished && ownerProfileId ? (
          <p style={{ marginTop: 12, fontSize: 13 }}>
            <Link href={loginNext} style={{ color: '#a5b4fc', fontWeight: 600 }}>
              {ilchon.goLogin}
            </Link>
          </p>
        ) : !isOwner &&
          ownerProfileId &&
          minihomeGuestbookEnabled &&
          isPublished &&
          viewerId &&
          ilchonMode !== 'linked' &&
          ilchonMode !== 'loading' &&
          ilchonMode !== 'noop' ? (
          <p style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>{L.ilchonOnlyHint}</p>
        ) : null}
      </div>

      <div style={{ ...sectionStyle, marginTop: 20, paddingTop: 20 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '0.02em' }}>{L.sectionOpen}</h2>
        <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.85 }}>{L.hintOpen}</p>
        {loading && rows === null ? (
          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>{L.loading}</p>
        ) : openRows.length === 0 ? (
          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>{L.emptyOpen}</p>
        ) : (
          renderList(openChrono, true)
        )}

        {showOpenComposer ? (
          <div style={{ marginTop: 12 }}>
            <textarea
              value={openBody}
              onChange={(e) => setOpenBody(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={L.placeholderOpen}
              style={{
                width: '100%',
                fontSize: 14,
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.25)',
                color: '#f8fafc',
              }}
            />
            <button
              type="button"
              onClick={() => void submit('open')}
              disabled={postBusy === 'open'}
              style={{
                marginTop: 8,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: postBusy === 'open' ? 'wait' : 'pointer',
              }}
            >
              {postBusy === 'open' ? L.submitting : L.submit}
            </button>
          </div>
        ) : viewerId === null && minihomeGuestbookEnabled && isPublished ? (
          <p style={{ marginTop: 12, fontSize: 13 }}>
            <Link href={loginNext} style={{ color: '#a5b4fc', fontWeight: 600 }}>
              {ilchon.goLogin}
            </Link>
            {' — '}
            {L.loginToPost}
          </p>
        ) : isOwner ? (
          <p style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>{L.ownerModerateHint}</p>
        ) : null}
      </div>
    </div>
  );
}
