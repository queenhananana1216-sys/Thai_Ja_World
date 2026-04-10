'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type EventRow = {
  id: string;
  title: string;
  body: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_published: boolean;
  created_at: string;
};

function toIsoOrNull(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatTime(v: string | null): string {
  if (!v) return '일정 미정';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '일정 미정';
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function OwnerShopEventsClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [published, setPublished] = useState(true);

  const countLabel = useMemo(() => `${rows.length}개`, [rows.length]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMsg(null);
    const sb = createBrowserClient();
    const { data, error } = await sb
      .from('local_spot_events')
      .select('id,title,body,starts_at,ends_at,is_published,created_at')
      .eq('local_spot_id', id)
      .order('starts_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      setMsg(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as EventRow[]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createEvent() {
    if (!id) return;
    const t = title.trim();
    if (t.length < 1) {
      setMsg('제목을 입력해 주세요.');
      return;
    }
    const s = toIsoOrNull(startsAt);
    const e = toIsoOrNull(endsAt);
    if (s && e && new Date(e).getTime() < new Date(s).getTime()) {
      setMsg('종료 시각은 시작 시각보다 뒤여야 합니다.');
      return;
    }

    setSaving(true);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb.from('local_spot_events').insert({
      local_spot_id: id,
      title: t,
      body: body.trim() || null,
      starts_at: s,
      ends_at: e,
      is_published: published,
    });
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setTitle('');
    setBody('');
    setStartsAt('');
    setEndsAt('');
    setPublished(true);
    setMsg('이벤트를 등록했습니다.');
    await load();
  }

  async function togglePublished(row: EventRow) {
    setBusyId(row.id);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb
      .from('local_spot_events')
      .update({ is_published: !row.is_published })
      .eq('id', row.id)
      .eq('local_spot_id', id);
    setBusyId(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    await load();
  }

  async function remove(row: EventRow) {
    if (!confirm('이 이벤트를 삭제할까요?')) return;
    setBusyId(row.id);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb.from('local_spot_events').delete().eq('id', row.id).eq('local_spot_id', id);
    setBusyId(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg('이벤트를 삭제했습니다.');
    await load();
  }

  if (!id) return null;
  if (loading) return <p style={{ color: '#64748b' }}>불러오는 중…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>등록된 이벤트: {countLabel}</p>
      {msg ? (
        <p style={{ margin: 0, fontSize: 14, color: msg.includes('등록') || msg.includes('삭제') ? '#059669' : '#dc2626' }}>{msg}</p>
      ) : null}

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#fff' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: '1rem' }}>새 이벤트 등록</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 (예: 금요일 라이브 공연)"
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="상세 안내"
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#475569' }}>
              시작
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>
            <label style={{ fontSize: 12, color: '#475569' }}>
              종료
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            공개 상태로 등록
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void createEvent()}
            style={{
              alignSelf: 'flex-start',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              background: '#7c3aed',
              color: '#fff',
              fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? '등록 중…' : '이벤트 등록'}
          </button>
        </div>
      </section>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {rows.length === 0 ? (
          <li style={{ color: '#64748b', fontSize: 14 }}>등록된 이벤트가 없습니다.</li>
        ) : (
          rows.map((row) => (
            <li key={row.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <strong>{row.title}</strong>
                <span style={{ fontSize: 12, color: row.is_published ? '#047857' : '#b45309' }}>
                  {row.is_published ? '공개' : '비공개'}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#334155' }}>{formatTime(row.starts_at)}{row.ends_at ? ` ~ ${formatTime(row.ends_at)}` : ''}</p>
              {row.body ? <p style={{ margin: '8px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{row.body}</p> : null}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void togglePublished(row)}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    borderRadius: 8,
                    padding: '6px 10px',
                    cursor: busyId === row.id ? 'wait' : 'pointer',
                  }}
                >
                  {row.is_published ? '비공개 전환' : '공개 전환'}
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void remove(row)}
                  style={{
                    border: 'none',
                    background: 'rgba(220,38,38,0.12)',
                    color: '#b91c1c',
                    borderRadius: 8,
                    padding: '6px 10px',
                    cursor: busyId === row.id ? 'wait' : 'pointer',
                  }}
                >
                  삭제
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
