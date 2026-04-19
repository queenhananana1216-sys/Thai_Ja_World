'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type Row = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  is_hidden: boolean;
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR');
  } catch {
    return iso;
  }
}

export default function OwnerShopGuestbookClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await sb
      .from('local_shop_guestbook_entries')
      .select('id, body, created_at, author_id, is_hidden')
      .eq('local_spot_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      setMsg(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as Row[];
    setRows(list);
    const pids = [...new Set(list.map((r) => r.author_id))];
    if (pids.length === 0) {
      setNames({});
      setLoading(false);
      return;
    }
    const { data: profs } = await sb.from('profiles').select('id, display_name').in('id', pids);
    const map: Record<string, string> = {};
    for (const p of profs ?? []) {
      map[p.id as string] = ((p.display_name as string) || '').trim() || '회원';
    }
    setNames(map);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleHidden(row: Row) {
    if (!id) return;
    setBusyId(row.id);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb
      .from('local_shop_guestbook_entries')
      .update({ is_hidden: !row.is_hidden })
      .eq('id', row.id)
      .eq('local_spot_id', id);
    setBusyId(null);
    if (error) setMsg(error.message);
    else await load();
  }

  async function removeRow(rowId: string) {
    if (!id || !confirm('이 방명록을 삭제할까요?')) return;
    setBusyId(rowId);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb.from('local_shop_guestbook_entries').delete().eq('id', rowId).eq('local_spot_id', id);
    setBusyId(null);
    if (error) setMsg(error.message);
    else await load();
  }

  if (!id) return null;
  if (loading) return <p style={{ color: '#64748b' }}>불러오는 중…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {msg ? <p style={{ fontSize: 14, color: '#dc2626' }}>{msg}</p> : null}
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
        방문자가 남긴 글을 숨기거나 삭제할 수 있습니다. 숨긴 글은 공개 미니홈에는 보이지 않고, 작성자와 사장님만 목록에서 확인할 수 있습니다.
      </p>
      {rows.length === 0 ? (
        <p style={{ color: '#64748b' }}>아직 방명록이 없습니다.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r) => (
            <li
              key={r.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 14,
                background: r.is_hidden ? '#fffbeb' : '#fff',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                {names[r.author_id] ?? r.author_id} · {formatWhen(r.created_at)}
                {r.is_hidden ? (
                  <span style={{ marginLeft: 8, fontWeight: 700, color: '#b45309' }}>숨김</span>
                ) : null}
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.body}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void toggleHidden(r)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: busyId === r.id ? 'wait' : 'pointer',
                  }}
                >
                  {r.is_hidden ? '다시 공개' : '숨기기'}
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void removeRow(r.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: busyId === r.id ? 'wait' : 'pointer',
                  }}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
