'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type Notice = {
  id: string;
  source_type: string;
  source_id: string | null;
  title: string;
  body: string | null;
  href: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

function fmt(v: string): string {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationsPageClient() {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const sb = createBrowserClient();
    void sb.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setUserId(data.session?.user.id ?? null);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    const res = await fetch('/api/notifications?limit=80', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      setErr('알림을 불러오지 못했습니다.');
      setLoading(false);
      return;
    }
    const body = (await res.json()) as { notifications?: Notice[] };
    setRows(body.notifications ?? []);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void load();
  }, [load, token]);

  useEffect(() => {
    if (!userId) return;
    const sb = createBrowserClient();
    const channel = sb
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [load, userId]);

  const unreadCount = useMemo(() => rows.filter((r) => !r.is_read).length, [rows]);

  async function markAllRead() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ markAllRead: true }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr('읽음 처리에 실패했습니다.');
      return;
    }
    await load();
  }

  async function markOneRead(id: string) {
    if (!token) return;
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: [id] }),
    });
    if (!res.ok) return;
    await load();
  }

  if (!token) {
    return (
      <div className="page-body board-page">
        <h1 className="board-title">알림함</h1>
        <p style={{ color: 'var(--tj-muted)' }}>로그인 후 이용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="page-body board-page" style={{ maxWidth: 760 }}>
      <header className="board-toolbar">
        <h1 className="board-title">알림함</h1>
        <button type="button" className="board-form__submit" disabled={busy || unreadCount === 0} onClick={() => void markAllRead()}>
          {busy ? '처리 중…' : `전체 읽음 (${unreadCount})`}
        </button>
      </header>

      {err ? <p className="auth-inline-error">{err}</p> : null}

      {loading ? (
        <p style={{ color: 'var(--tj-muted)' }}>불러오는 중…</p>
      ) : rows.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--tj-muted)' }}>아직 알림이 없습니다.</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {rows.map((row) => (
            <li
              key={row.id}
              className="card"
              style={{ padding: 12, borderColor: row.is_read ? 'var(--tj-line)' : '#7c3aed', boxShadow: row.is_read ? undefined : '4px 4px 0 rgba(124,58,237,0.24)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <strong>{row.title}</strong>
                <span style={{ fontSize: 12, color: '#64748b' }}>{fmt(row.created_at)}</span>
              </div>
              {row.body ? <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: 14 }}>{row.body}</p> : null}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {row.href ? (
                  row.href.startsWith('/') ? (
                    <Link href={row.href} className="board-form__submit" style={{ textDecoration: 'none', padding: '6px 12px' }}>
                      이동
                    </Link>
                  ) : (
                    <a href={row.href} target="_blank" rel="noopener noreferrer" className="board-form__submit" style={{ textDecoration: 'none', padding: '6px 12px' }}>
                      이동
                    </a>
                  )
                ) : null}
                {!row.is_read ? (
                  <button
                    type="button"
                    onClick={() => void markOneRead(row.id)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff', cursor: 'pointer' }}
                  >
                    읽음 처리
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: '#64748b' }}>읽음</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
