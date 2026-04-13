'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';

type Room = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
};

type MessageRow = {
  id: string;
  room_id: string;
  author_id: string;
  body: string;
  is_deleted: boolean;
  created_at: string;
};

function fmt(v: string, locale: 'ko' | 'th'): string {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString(locale === 'th' ? 'th-TH' : 'ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPageClient() {
  const { locale } = useClientLocaleDictionary();
  const T = locale === 'th'
    ? {
        title: 'แชต',
        loginNeeded: 'ต้องล็อกอินก่อนใช้งาน',
        roomListFail: 'โหลดรายชื่อห้องแชตไม่สำเร็จ',
        messagesFail: 'โหลดข้อความไม่สำเร็จ',
        sendFail: 'ส่งข้อความไม่สำเร็จ',
        rooms: 'ห้องแชต',
        loading: 'กำลังโหลด…',
        noRooms: 'ยังไม่มีห้องแชต',
        noMessages: 'ยังไม่มีข้อความ',
        inputPlaceholder: 'พิมพ์ข้อความ',
        sending: 'กำลังส่ง…',
        send: 'ส่ง',
      }
    : {
        title: '채팅',
        loginNeeded: '로그인 후 이용할 수 있습니다.',
        roomListFail: '채팅방 목록을 불러오지 못했습니다.',
        messagesFail: '메시지를 불러오지 못했습니다.',
        sendFail: '메시지 전송에 실패했습니다.',
        rooms: '채팅방',
        loading: '불러오는 중…',
        noRooms: '채팅방이 없습니다.',
        noMessages: '아직 메시지가 없습니다.',
        inputPlaceholder: '메시지를 입력하세요.',
        sending: '전송 중…',
        send: '전송',
      };
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>('');
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
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

  const loadRooms = useCallback(async () => {
    if (!token) return;
    setLoadingRooms(true);
    setErr(null);
    const res = await fetch('/api/chat/rooms', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      setErr(T.roomListFail);
      setLoadingRooms(false);
      return;
    }
    const body = (await res.json()) as { rooms?: Room[] };
    const list = body.rooms ?? [];
    setRooms(list);
    if (!roomId && list.length > 0) setRoomId(list[0]!.id);
    setLoadingRooms(false);
  }, [roomId, token]);

  const loadMessages = useCallback(async () => {
    if (!token || !roomId) return;
    setLoadingMessages(true);
    setErr(null);
    const res = await fetch(`/api/chat/messages?room_id=${encodeURIComponent(roomId)}&limit=120`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      setErr(T.messagesFail);
      setLoadingMessages(false);
      return;
    }
    const body = (await res.json()) as { messages?: MessageRow[]; names?: Record<string, string> };
    setMessages(body.messages ?? []);
    setNames(body.names ?? {});
    setLoadingMessages(false);
  }, [roomId, token]);

  useEffect(() => {
    if (!token) return;
    void loadRooms();
  }, [loadRooms, token]);

  useEffect(() => {
    if (!token || !roomId) return;
    void loadMessages();
  }, [loadMessages, roomId, token]);

  useEffect(() => {
    if (!roomId) return;
    const sb = createBrowserClient();
    const channel = sb
      .channel(`chat-room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        () => {
          void loadMessages();
        },
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [loadMessages, roomId]);

  const roomTitle = useMemo(() => rooms.find((r) => r.id === roomId)?.title ?? T.title, [T.title, roomId, rooms]);

  async function send() {
    if (!token || !roomId) return;
    const body = draft.trim();
    if (body.length < 1) return;
    setSending(true);
    setErr(null);
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ room_id: roomId, body }),
    });
    setSending(false);
    if (!res.ok) {
      setErr(T.sendFail);
      return;
    }
    setDraft('');
    await loadMessages();
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
    <div className="page-body board-page" style={{ maxWidth: 860 }}>
      <header className="board-toolbar">
        <h1 className="board-title">{T.title}</h1>
        <span style={{ fontSize: 13, color: 'var(--tj-muted)' }}>{roomTitle}</span>
      </header>

      {err ? <p className="auth-inline-error">{err}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
        <aside className="card" style={{ padding: 12 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 14 }}>{T.rooms}</h2>
          {loadingRooms ? (
            <p style={{ margin: 0, color: 'var(--tj-muted)', fontSize: 13 }}>{T.loading}</p>
          ) : rooms.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--tj-muted)', fontSize: 13 }}>{T.noRooms}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
              {rooms.map((room) => (
                <li key={room.id}>
                  <button
                    type="button"
                    onClick={() => setRoomId(room.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: roomId === room.id ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '8px 10px',
                      background: roomId === room.id ? 'rgba(124,58,237,0.08)' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: 13 }}>{room.title}</strong>
                    {room.description ? (
                      <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 2 }}>{room.description}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
          <div
            style={{
              minHeight: 360,
              maxHeight: 480,
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 10,
              background: '#fff',
            }}
          >
            {loadingMessages ? (
              <p style={{ margin: 0, color: 'var(--tj-muted)', fontSize: 13 }}>{T.loading}</p>
            ) : messages.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--tj-muted)', fontSize: 13 }}>{T.noMessages}</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {messages.map((m) => {
                  const mine = userId === m.author_id;
                  return (
                    <li key={m.id} style={{ display: 'grid', justifyItems: mine ? 'end' : 'start' }}>
                      <div
                        style={{
                          maxWidth: '88%',
                          borderRadius: 10,
                          padding: '8px 10px',
                          background: mine ? 'rgba(124,58,237,0.12)' : '#f8fafc',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                          {names[m.author_id] ?? 'member'} · {fmt(m.created_at, locale)}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.45 }}>
                          {m.is_deleted ? '(삭제됨)' : m.body}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={T.inputPlaceholder}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
            />
            <button
              type="button"
              disabled={sending || !roomId}
              onClick={() => void send()}
              className="board-form__submit"
              style={{ justifySelf: 'end' }}
            >
              {sending ? T.sending : T.send}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
