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

type SlugMap = Record<string, string>;

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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [slugs, setSlugs] = useState<SlugMap>({});

  const [acceptFor, setAcceptFor] = useState<ReqRow | null>(null);
  const [nickYouCallThem, setNickYouCallThem] = useState('');
  const [nickTheyCallYou, setNickTheyCallYou] = useState('');

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
    for (const p of profRes.data ?? []) {
      map[p.id as string] = ((p.display_name as string) || '').trim() || 'member';
    }
    setNames(map);
    const sMap: SlugMap = {};
    for (const s of slugRes.data ?? []) {
      sMap[s.owner_id as string] = s.public_slug as string;
    }
    setSlugs(sMap);
    setBootDone(true);
  }, []);

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

  const loginHref = useMemo(() => `/auth/login?next=${encodeURIComponent('/ilchon')}`, []);

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
                    미니홈 방문
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

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
    </div>
  );
}
