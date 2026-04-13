'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import { createBrowserClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatDate';

type ReqRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string | null;
  proposed_nickname_for_peer: string | null;
  created_at: string;
};

type LinkRow = {
  peer_id: string;
  my_nickname_for_peer: string;
  created_at: string;
};

type SearchRow = {
  user_id: string;
  display_name: string;
  public_slug: string | null;
  is_ilchon: boolean;
  pending_outbound: boolean;
  pending_inbound: boolean;
  last_seen_at: string | null;
};

type DmRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

type NoteRow = {
  peerId: string;
  latestBody: string;
  latestAt: string;
  unreadCount: number;
};

type SlugMap = Record<string, string>;
type LastSeenMap = Record<string, string | null>;

function mapRpcMessage(raw: string, L: Dictionary['ilchon']): string {
  const m = raw.toLowerCase();
  if (m.includes('pending_request_exists')) return L.errorPendingExists;
  if (m.includes('already_ilchon')) return L.errorAlreadyIlchon;
  if (m.includes('not_authenticated')) return L.errorNotAuth;
  if (m.includes('cannot_request_self')) return L.errorSelf;
  return L.errorGeneric;
}

export default function IlchonInbox({ labels }: { labels: Dictionary['ilchon'] }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [bootDone, setBootDone] = useState(false);
  const [incoming, setIncoming] = useState<ReqRow[]>([]);
  const [outgoing, setOutgoing] = useState<ReqRow[]>([]);
  const [friends, setFriends] = useState<LinkRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [lastSeen, setLastSeen] = useState<LastSeenMap>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [slugs, setSlugs] = useState<SlugMap>({});
  const [notes, setNotes] = useState<NoteRow[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchRows, setSearchRows] = useState<SearchRow[]>([]);
  const [requestFor, setRequestFor] = useState<SearchRow | null>(null);
  const [reqMsg, setReqMsg] = useState('');
  const [reqNick, setReqNick] = useState('');

  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [dmRows, setDmRows] = useState<DmRow[]>([]);
  const [dmDraft, setDmDraft] = useState('');
  const [dmLoading, setDmLoading] = useState(false);
  const [dmSending, setDmSending] = useState(false);

  const [acceptFor, setAcceptFor] = useState<ReqRow | null>(null);
  const [nickYouCallThem, setNickYouCallThem] = useState('');
  const [nickTheyCallYou, setNickTheyCallYou] = useState('');

  const loadNotes = useCallback(async (uid: string) => {
    const sb = createBrowserClient();
    const { data } = await sb
      .from('ilchon_dm_messages')
      .select('id, from_user_id, to_user_id, body, is_read, created_at')
      .eq('to_user_id', uid)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(100);
    const grouped = new Map<string, NoteRow>();
    for (const row of (data ?? []) as DmRow[]) {
      const prev = grouped.get(row.from_user_id);
      if (!prev) {
        grouped.set(row.from_user_id, {
          peerId: row.from_user_id,
          latestBody: row.body,
          latestAt: row.created_at,
          unreadCount: 1,
        });
      } else {
        prev.unreadCount += 1;
      }
    }
    setNotes([...grouped.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt)));
  }, []);

  const loadAll = useCallback(async () => {
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setUserId(null);
      setBootDone(true);
      return;
    }
    setUserId(user.id);

    const [inc, out, fr] = await Promise.all([
      sb
        .from('ilchon_requests')
        .select('id, from_user_id, to_user_id, message, proposed_nickname_for_peer, created_at')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      sb
        .from('ilchon_requests')
        .select('id, from_user_id, to_user_id, message, proposed_nickname_for_peer, created_at')
        .eq('from_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      sb
        .from('ilchon_links')
        .select('peer_id, my_nickname_for_peer, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    const incRows = (inc.data ?? []) as ReqRow[];
    const outRows = (out.data ?? []) as ReqRow[];
    const frRows = (fr.data ?? []) as LinkRow[];
    setIncoming(incRows);
    setOutgoing(outRows);
    setFriends(frRows);

    const ids = new Set<string>();
    for (const r of incRows) ids.add(r.from_user_id);
    for (const r of outRows) ids.add(r.to_user_id);
    for (const r of frRows) ids.add(r.peer_id);
    if (ids.size === 0) {
      setNames({});
      setBootDone(true);
      return;
    }
    const [profRes, slugRes] = await Promise.all([
      sb.from('profiles').select('id, display_name').in('id', [...ids]),
      sb.from('user_minihomes').select('owner_id, public_slug').in('owner_id', [...ids]).eq('is_public', true),
    ]);
    const map: Record<string, string> = {};
    const seenMap: LastSeenMap = {};
    for (const p of profRes.data ?? []) {
      map[p.id as string] = ((p.display_name as string) || '').trim() || 'member';
      seenMap[p.id as string] = (p as { last_seen_at?: string | null }).last_seen_at ?? null;
    }
    setNames(map);
    setLastSeen(seenMap);
    const sMap: SlugMap = {};
    for (const s of slugRes.data ?? []) {
      sMap[s.owner_id as string] = s.public_slug as string;
    }
    setSlugs(sMap);
    await loadNotes(user.id);
    setBootDone(true);
  }, [loadNotes]);

  const loadDm = useCallback(
    async (peerId: string) => {
      if (!userId) return;
      setDmLoading(true);
      const sb = createBrowserClient();
      const { data } = await sb
        .from('ilchon_dm_messages')
        .select('id, from_user_id, to_user_id, body, is_read, created_at')
        .or(
          `and(from_user_id.eq.${userId},to_user_id.eq.${peerId}),and(from_user_id.eq.${peerId},to_user_id.eq.${userId})`,
        )
        .order('created_at', { ascending: true })
        .limit(200);
      setDmRows((data ?? []) as DmRow[]);
      await sb
        .from('ilchon_dm_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('to_user_id', userId)
        .eq('from_user_id', peerId)
        .eq('is_read', false);
      await loadNotes(userId);
      setDmLoading(false);
    },
    [loadNotes, userId],
  );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openAccept = (r: ReqRow) => {
    setAcceptFor(r);
    setNickYouCallThem('');
    setNickTheyCallYou((r.proposed_nickname_for_peer ?? '').trim());
  };

  const submitAccept = async () => {
    if (!acceptFor) return;
    const a = nickYouCallThem.trim();
    const b = nickTheyCallYou.trim();
    if (a.length < 1 || a.length > 40 || b.length < 1 || b.length > 40) return;
    setBusyId(acceptFor.id);
    setToast(null);
    const sb = createBrowserClient();
    const { error } = await sb.rpc('ilchon_accept_request', {
      p_request_id: acceptFor.id,
      p_acceptor_calls_requester: a,
      p_requester_calls_acceptor: b,
    });
    setBusyId(null);
    if (error) {
      setToast(mapRpcMessage(error.message ?? '', labels));
      return;
    }
    setAcceptFor(null);
    await loadAll();
  };

  const runReject = async (id: string) => {
    setBusyId(id);
    setToast(null);
    const sb = createBrowserClient();
    const { error } = await sb.rpc('ilchon_reject_request', { p_request_id: id });
    setBusyId(null);
    if (error) {
      setToast(mapRpcMessage(error.message ?? '', labels));
      return;
    }
    await loadAll();
  };

  const runCancel = async (id: string) => {
    setBusyId(id);
    setToast(null);
    const sb = createBrowserClient();
    const { error } = await sb.rpc('ilchon_cancel_request', { p_request_id: id });
    setBusyId(null);
    if (error) {
      setToast(mapRpcMessage(error.message ?? '', labels));
      return;
    }
    await loadAll();
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchRows([]);
      return;
    }
    setSearchBusy(true);
    setToast(null);
    const sb = createBrowserClient();
    const { data, error } = await sb.rpc('ilchon_search_users', {
      p_query: searchQuery.trim(),
      p_limit: 10,
    });
    setSearchBusy(false);
    if (error) {
      setToast(mapRpcMessage(error.message ?? '', labels));
      return;
    }
    setSearchRows((data ?? []) as SearchRow[]);
  };

  const runSendRequest = async () => {
    if (!requestFor) return;
    setBusyId(`req-${requestFor.user_id}`);
    setToast(null);
    const sb = createBrowserClient();
    const { error } = await sb.rpc('ilchon_send_request', {
      p_to_user_id: requestFor.user_id,
      p_message: reqMsg.trim() || null,
      p_proposed_nickname: reqNick.trim() || null,
    });
    setBusyId(null);
    if (error) {
      setToast(mapRpcMessage(error.message ?? '', labels));
      return;
    }
    setRequestFor(null);
    setReqMsg('');
    setReqNick('');
    await loadAll();
    await runSearch();
  };

  const runSendDm = async () => {
    if (!activePeer || !dmDraft.trim()) return;
    setDmSending(true);
    setToast(null);
    const sb = createBrowserClient();
    const { error } = await sb.rpc('ilchon_send_dm', {
      p_to_user_id: activePeer,
      p_body: dmDraft.trim(),
    });
    setDmSending(false);
    if (error) {
      setToast(mapRpcMessage(error.message ?? '', labels));
      return;
    }
    setDmDraft('');
    await loadDm(activePeer);
  };

  useEffect(() => {
    if (!activePeer) return;
    void loadDm(activePeer);
  }, [activePeer, loadDm]);

  useEffect(() => {
    if (!userId) return;
    const sb = createBrowserClient();
    const channel = sb
      .channel(`ilchon-dm-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ilchon_dm_messages', filter: `to_user_id=eq.${userId}` },
        () => {
          if (activePeer) void loadDm(activePeer);
          void loadNotes(userId);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ilchon_dm_messages', filter: `from_user_id=eq.${userId}` },
        () => {
          if (activePeer) void loadDm(activePeer);
        },
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [activePeer, loadDm, loadNotes, userId]);

  useEffect(() => {
    if (!userId) return;
    const sb = createBrowserClient();
    const sendPresence = (online: boolean) =>
      sb.rpc('ilchon_set_presence', {
        p_active_peer_id: activePeer,
        p_is_online: online,
      });
    void sendPresence(true);
    const timer = setInterval(() => {
      void sendPresence(!document.hidden);
    }, 25000);
    const onVis = () => void sendPresence(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      void sb.rpc('ilchon_set_presence', { p_active_peer_id: null, p_is_online: false });
    };
  }, [activePeer, userId]);

  const loginHref = useMemo(() => `/auth/login?next=${encodeURIComponent('/ilchon')}`, []);
  const activePeerName = activePeer ? names[activePeer] ?? 'member' : '';

  if (!bootDone) {
    return <p className="ilchon-page__muted">…</p>;
  }

  if (!userId) {
    return (
      <div className="card ilchon-page__gate">
        <p>{labels.needLogin}</p>
        <Link className="ilchon-btn" href={loginHref}>
          {labels.goLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="ilchon-page">
      {toast ? <p className="ilchon-page__toast">{toast}</p> : null}

      <p className="ilchon-page__lead">{labels.pageLead}</p>

      <section className="ilchon-page__section" aria-labelledby="ilchon-search">
        <h2 id="ilchon-search" className="ilchon-page__h2">
          {labels.searchTitle}
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            style={{ flex: '1 1 220px', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--tj-line)' }}
          />
          <button type="button" className="ilchon-btn" disabled={searchBusy} onClick={() => void runSearch()}>
            {searchBusy ? labels.searching : labels.searchButton}
          </button>
        </div>
        {searchRows.length > 0 ? (
          <ul className="ilchon-page__list" style={{ marginTop: 12 }}>
            {searchRows.map((r) => (
              <li key={r.user_id} className="ilchon-page__item card">
                <div className="ilchon-page__item-head">
                  <strong>{r.display_name}</strong>
                  <span className="ilchon-page__muted">
                    {r.last_seen_at ? `${labels.lastSeenLabel} ${formatDate(r.last_seen_at)}` : labels.lastSeenUnknown}
                  </span>
                </div>
                <div className="ilchon-page__actions">
                  {r.public_slug ? (
                    <Link href={`/minihome/${r.public_slug}`} className="ilchon-btn ilchon-btn--ghost">
                      {labels.visitMinihome}
                    </Link>
                  ) : null}
                  {r.is_ilchon ? (
                    <button type="button" className="ilchon-btn ilchon-btn--ghost" onClick={() => setActivePeer(r.user_id)}>
                      {labels.openChat}
                    </button>
                  ) : r.pending_outbound ? (
                    <span className="ilchon-page__muted">{labels.pendingOutbound}</span>
                  ) : r.pending_inbound ? (
                    <span className="ilchon-page__muted">{labels.pendingInbound}</span>
                  ) : (
                    <button type="button" className="ilchon-btn" onClick={() => setRequestFor(r)}>
                      {labels.requestButton}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section id="ilchon-notes" className="ilchon-page__section" aria-labelledby="ilchon-notes-title">
        <h2 id="ilchon-notes-title" className="ilchon-page__h2">
          {labels.notesTitle}
        </h2>
        {notes.length === 0 ? (
          <p className="ilchon-page__muted">{labels.notesEmpty}</p>
        ) : (
          <ul className="ilchon-page__list">
            {notes.map((n) => (
              <li key={n.peerId} className="ilchon-page__item card">
                <div className="ilchon-page__item-head">
                  <strong>{names[n.peerId] ?? 'member'}</strong>
                  <span className="ilchon-page__muted">{formatDate(n.latestAt)}</span>
                </div>
                <p className="ilchon-page__msg">{n.latestBody}</p>
                <div className="ilchon-page__actions">
                  <span className="ilchon-page__muted">
                    {labels.notesUnreadPrefix} {n.unreadCount}
                  </span>
                  <button type="button" className="ilchon-btn" onClick={() => setActivePeer(n.peerId)}>
                    {labels.openChat}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        id="ilchon-received"
        className="ilchon-page__section"
        aria-labelledby="ilchon-in"
      >
        <h2 id="ilchon-in" className="ilchon-page__h2">
          {labels.incomingTitle}
        </h2>
        {incoming.length === 0 ? (
          <p className="ilchon-page__muted">{labels.incomingEmpty}</p>
        ) : (
          <ul className="ilchon-page__list">
            {incoming.map((r) => (
              <li key={r.id} className="ilchon-page__item card">
                <div className="ilchon-page__item-head">
                  <strong>{names[r.from_user_id] ?? 'member'}</strong>
                  <span className="ilchon-page__muted">{formatDate(r.created_at)}</span>
                </div>
                {r.message ? <p className="ilchon-page__msg">{r.message}</p> : null}
                {r.proposed_nickname_for_peer ? (
                  <p className="ilchon-page__hint">
                    {labels.proposedFromThem}: “{r.proposed_nickname_for_peer}”
                  </p>
                ) : null}
                <div className="ilchon-page__actions">
                  <button
                    type="button"
                    className="ilchon-btn"
                    disabled={busyId === r.id}
                    onClick={() => openAccept(r)}
                  >
                    {labels.accept}
                  </button>
                  <button
                    type="button"
                    className="ilchon-btn ilchon-btn--ghost"
                    disabled={busyId === r.id}
                    onClick={() => void runReject(r.id)}
                  >
                    {labels.reject}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ilchon-page__section" aria-labelledby="ilchon-out">
        <h2 id="ilchon-out" className="ilchon-page__h2">
          {labels.outgoingTitle}
        </h2>
        {outgoing.length === 0 ? (
          <p className="ilchon-page__muted">{labels.outgoingEmpty}</p>
        ) : (
          <ul className="ilchon-page__list">
            {outgoing.map((r) => (
              <li key={r.id} className="ilchon-page__item card">
                <div className="ilchon-page__item-head">
                  <strong>{names[r.to_user_id] ?? 'member'}</strong>
                  <span className="ilchon-page__muted">{formatDate(r.created_at)}</span>
                </div>
                <div className="ilchon-page__actions">
                  <button
                    type="button"
                    className="ilchon-btn ilchon-btn--ghost"
                    disabled={busyId === r.id}
                    onClick={() => void runCancel(r.id)}
                  >
                    {labels.cancelRequest}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ilchon-page__section" aria-labelledby="ilchon-friends">
        <h2 id="ilchon-friends" className="ilchon-page__h2">
          {labels.friendsTitle}
        </h2>
        {friends.length === 0 ? (
          <p className="ilchon-page__muted">{labels.friendsEmpty}</p>
        ) : (
          <ul className="ilchon-page__list">
            {friends.map((r) => (
              <li key={r.peer_id} className="ilchon-page__item card">
                <div className="ilchon-page__item-head">
                  <strong>{names[r.peer_id] ?? 'member'}</strong>
                  <span className="ilchon-page__muted">{formatDate(r.created_at)}</span>
                </div>
                <p className="ilchon-page__nick">
                  {labels.youCallThemLabel}: “{r.my_nickname_for_peer}”
                </p>
                {slugs[r.peer_id] ? (
                  <Link
                    href={`/minihome/${slugs[r.peer_id]}`}
                    className="ilchon-btn ilchon-btn--ghost"
                    style={{ fontSize: '0.78rem', padding: '4px 10px', marginTop: 6, display: 'inline-block' }}
                  >
                    {labels.visitMinihome}
                  </Link>
                ) : null}
                <p className="ilchon-page__muted" style={{ marginTop: 8 }}>
                  {(() => {
                    const v = lastSeen[r.peer_id];
                    if (!v) return labels.lastSeenUnknown;
                    const diffMs = Date.now() - new Date(v).getTime();
                    if (diffMs < 180000) return labels.onlineNow;
                    return `${labels.lastSeenLabel} ${formatDate(v)}`;
                  })()}
                </p>
                <div className="ilchon-page__actions">
                  <button type="button" className="ilchon-btn" onClick={() => setActivePeer(r.peer_id)}>
                    {labels.openChat}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {activePeer ? (
        <section className="ilchon-page__section" aria-labelledby="ilchon-chat">
          <h2 id="ilchon-chat" className="ilchon-page__h2">
            {labels.chatWithPrefix} {activePeerName}
          </h2>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--tj-line)', borderRadius: 8, padding: 8 }}>
              {dmLoading ? (
                <p className="ilchon-page__muted">…</p>
              ) : dmRows.length === 0 ? (
                <p className="ilchon-page__muted">{labels.chatEmpty}</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                  {dmRows.map((m) => {
                    const mine = m.from_user_id === userId;
                    return (
                      <li key={m.id} style={{ display: 'grid', justifyItems: mine ? 'end' : 'start' }}>
                        <div style={{ maxWidth: '88%', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--tj-line)', background: mine ? 'rgba(124,58,237,0.08)' : '#fff' }}>
                          <div style={{ fontSize: 11, color: 'var(--tj-muted)', marginBottom: 3 }}>
                            {mine ? labels.youLabel : activePeerName} · {formatDate(m.created_at)}
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{m.body}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              <textarea
                value={dmDraft}
                onChange={(e) => setDmDraft(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={labels.dmPlaceholder}
                style={{ width: '100%', borderRadius: 8, border: '1px solid var(--tj-line)', padding: '8px 10px' }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="ilchon-btn ilchon-btn--ghost" onClick={() => setActivePeer(null)}>
                  {labels.close}
                </button>
                <button type="button" className="ilchon-btn" disabled={dmSending || !dmDraft.trim()} onClick={() => void runSendDm()}>
                  {dmSending ? labels.dmSending : labels.dmSend}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {acceptFor ? (
        <div
          className="minihome-ilchon-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ilchon-accept-title"
        >
          <div className="minihome-ilchon-modal__card card">
            <h3 id="ilchon-accept-title" className="minihome-ilchon-modal__title">
              {labels.acceptTitle}
            </h3>
            <p className="ilchon-page__muted">
              {names[acceptFor.from_user_id] ?? 'member'}
            </p>
            <label className="minihome-ilchon-modal__field">
              <span>{labels.nickYouCallThem}</span>
              <input
                type="text"
                maxLength={40}
                value={nickYouCallThem}
                onChange={(e) => setNickYouCallThem(e.target.value)}
                placeholder={labels.nickYouCallThemHint}
              />
            </label>
            <label className="minihome-ilchon-modal__field">
              <span>{labels.nickTheyCallYou}</span>
              <input
                type="text"
                maxLength={40}
                value={nickTheyCallYou}
                onChange={(e) => setNickTheyCallYou(e.target.value)}
                placeholder={labels.nickTheyCallYouHint}
              />
            </label>
            <div className="minihome-ilchon-modal__actions">
              <button
                type="button"
                className="ilchon-btn"
                disabled={
                  busyId === acceptFor.id ||
                  nickYouCallThem.trim().length < 1 ||
                  nickTheyCallYou.trim().length < 1
                }
                onClick={() => void submitAccept()}
              >
                {labels.confirmAccept}
              </button>
              <button
                type="button"
                className="ilchon-btn ilchon-btn--ghost"
                disabled={busyId === acceptFor.id}
                onClick={() => setAcceptFor(null)}
              >
                {labels.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {requestFor ? (
        <div className="minihome-ilchon-modal" role="dialog" aria-modal="true" aria-labelledby="ilchon-request-title">
          <div className="minihome-ilchon-modal__card card">
            <h3 id="ilchon-request-title" className="minihome-ilchon-modal__title">
              {labels.requestTitle}
            </h3>
            <p className="ilchon-page__muted">{requestFor.display_name}</p>
            <label className="minihome-ilchon-modal__field">
              <span>{labels.messageLabel}</span>
              <input type="text" maxLength={500} value={reqMsg} onChange={(e) => setReqMsg(e.target.value)} placeholder={labels.messagePlaceholder} />
            </label>
            <label className="minihome-ilchon-modal__field">
              <span>{labels.proposedNickLabel}</span>
              <input type="text" maxLength={40} value={reqNick} onChange={(e) => setReqNick(e.target.value)} placeholder={labels.proposedNickHint} />
            </label>
            <div className="minihome-ilchon-modal__actions">
              <button
                type="button"
                className="ilchon-btn"
                disabled={busyId === `req-${requestFor.user_id}`}
                onClick={() => void runSendRequest()}
              >
                {busyId === `req-${requestFor.user_id}` ? labels.sending : labels.sendRequest}
              </button>
              <button type="button" className="ilchon-btn ilchon-btn--ghost" onClick={() => setRequestFor(null)}>
                {labels.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
