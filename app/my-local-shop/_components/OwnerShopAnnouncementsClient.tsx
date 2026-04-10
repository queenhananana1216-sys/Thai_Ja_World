'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type AnnouncementKind = 'notice' | 'special_menu' | 'hours' | 'other';

type AnnouncementRow = {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  is_published: boolean;
  created_at: string;
};

const KIND_LABEL: Record<AnnouncementKind, string> = {
  notice: '일반 공지',
  special_menu: '특별 메뉴',
  hours: '영업시간 안내',
  other: '기타',
};

function formatDate(v: string): string {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function OwnerShopAnnouncementsClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [kind, setKind] = useState<AnnouncementKind>('notice');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [published, setPublished] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMsg(null);
    const sb = createBrowserClient();
    const { data, error } = await sb
      .from('local_spot_announcements')
      .select('id,kind,title,body,is_published,created_at')
      .eq('local_spot_id', id)
      .order('created_at', { ascending: false });
    if (error) {
      setMsg(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as AnnouncementRow[]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAnnouncement() {
    if (!id) return;
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      setMsg('제목과 내용을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb.from('local_spot_announcements').insert({
      local_spot_id: id,
      kind,
      title: t,
      body: b,
      is_published: published,
    });
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setTitle('');
    setBody('');
    setKind('notice');
    setPublished(true);
    setMsg('공지를 저장했습니다. 공개 공지는 알림함으로 전달됩니다.');
    await load();
  }

  async function togglePublished(row: AnnouncementRow) {
    setBusyId(row.id);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb
      .from('local_spot_announcements')
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

  async function remove(row: AnnouncementRow) {
    if (!confirm('이 공지를 삭제할까요?')) return;
    setBusyId(row.id);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb.from('local_spot_announcements').delete().eq('id', row.id).eq('local_spot_id', id);
    setBusyId(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg('공지를 삭제했습니다.');
    await load();
  }

  if (!id) return null;
  if (loading) return <p style={{ color: '#64748b' }}>불러오는 중…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
        공개 공지를 등록하면 가게 오너와 일촌인 사용자의 알림함에 전달됩니다.
      </p>
      {msg ? (
        <p style={{ margin: 0, fontSize: 14, color: msg.includes('저장') || msg.includes('삭제') ? '#059669' : '#dc2626' }}>{msg}</p>
      ) : null}

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#fff' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: '1rem' }}>공지 작성</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ fontSize: 12, color: '#475569' }}>
            공지 종류
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as AnnouncementKind)}
              style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              <option value="notice">일반 공지</option>
              <option value="special_menu">특별 메뉴</option>
              <option value="hours">영업시간 안내</option>
              <option value="other">기타</option>
            </select>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="내용"
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            공개 상태로 등록
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void createAnnouncement()}
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
            {saving ? '저장 중…' : '공지 저장'}
          </button>
        </div>
      </section>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {rows.length === 0 ? (
          <li style={{ color: '#64748b', fontSize: 14 }}>등록된 공지가 없습니다.</li>
        ) : (
          rows.map((row) => (
            <li key={row.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <strong>{row.title}</strong>
                <span style={{ fontSize: 12, color: row.is_published ? '#047857' : '#b45309' }}>
                  {row.is_published ? '공개' : '비공개'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                {KIND_LABEL[row.kind]} · {formatDate(row.created_at)}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{row.body}</p>
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
