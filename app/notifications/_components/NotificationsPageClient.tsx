'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
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

function fmt(v: string, locale: 'ko' | 'th'): string {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(locale === 'th' ? 'th-TH' : 'ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPageClient() {
  const { locale } = useClientLocaleDictionary();
  const T = locale === 'th'
    ? {
        title: 'กล่องแจ้งเตือน',
        loginNeeded: 'ต้องล็อกอินก่อนใช้งาน',
        loadFail: 'โหลดการแจ้งเตือนไม่สำเร็จ',
        markFail: 'ทำเครื่องหมายว่าอ่านแล้วไม่สำเร็จ',
        busy: 'กำลังดำเนินการ…',
        markAll: 'อ่านทั้งหมด',
        loading: 'กำลังโหลด…',
        empty: 'ยังไม่มีการแจ้งเตือน',
        move: 'ไปที่',
        markRead: 'ทำว่าอ่านแล้ว',
        read: 'อ่านแล้ว',
      }
    : {
        title: '알림함',
        loginNeeded: '로그인 후 이용할 수 있습니다.',
        loadFail: '알림을 불러오지 못했습니다.',
        markFail: '읽음 처리에 실패했습니다.',
        busy: '처리 중…',
        markAll: '전체 읽음',
        loading: '불러오는 중…',
        empty: '아직 알림이 없습니다.',
        move: '이동',
        markRead: '읽음 처리',
        read: '읽음',
      };
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
      setErr(T.loadFail);
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
      setErr(T.markFail);
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
        <h1 className="board-title">{T.title}</h1>
        <p style={{ color: 'var(--tj-muted)' }}>{T.loginNeeded}</p>
      </div>
    );
  }

  return (
    <div className="page-body board-page" style={{ maxWidth: 760 }}>
      <header className="board-toolbar">
        <h1 className="board-title">{T.title}</h1>
        <button type="button" className="board-form__submit" disabled={busy || unreadCount === 0} onClick={() => void markAllRead()}>
          {busy ? T.busy : `${T.markAll} (${unreadCount})`}
        </button>
      </header>

      {err ? <p className="auth-inline-error">{err}</p> : null}

      {loading ? (
        <p style={{ color: 'var(--tj-muted)' }}>{T.loading}</p>
      ) : rows.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--tj-muted)' }}>{T.empty}</p>
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
                <span style={{ fontSize: 12, color: '#64748b' }}>{fmt(row.created_at, locale)}</span>
              </div>
              {row.body ? <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: 14 }}>{row.body}</p> : null}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {row.href ? (
                  row.href.startsWith('/') ? (
                    <Link href={row.href} className="board-form__submit" style={{ textDecoration: 'none', padding: '6px 12px' }}>
                      {T.move}
                    </Link>
                  ) : (
                    <a href={row.href} target="_blank" rel="noopener noreferrer" className="board-form__submit" style={{ textDecoration: 'none', padding: '6px 12px' }}>
                      {T.move}
                    </a>
                  )
                ) : null}
                {!row.is_read ? (
                  <button
                    type="button"
                    onClick={() => void markOneRead(row.id)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff', cursor: 'pointer' }}
                  >
                    {T.markRead}
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: '#64748b' }}>{T.read}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
