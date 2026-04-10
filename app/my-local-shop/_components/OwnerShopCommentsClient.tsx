'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  entry_kind: 'open' | 'ilchon';
  is_hidden: boolean;
  owner_reply: string | null;
  owner_reply_at: string | null;
};

function formatDate(v: string | null): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function OwnerShopCommentsClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [rows, setRows] = useState<CommentRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMsg(null);
    const sb = createBrowserClient();
    const { data, error } = await sb
      .from('local_shop_guestbook_entries')
      .select('id,body,created_at,author_id,entry_kind,is_hidden,owner_reply,owner_reply_at')
      .eq('local_spot_id', id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) {
      setRows([]);
      setNames({});
      if (error) setMsg(error.message);
      setLoading(false);
      return;
    }

    const list = (data as CommentRow[]) ?? [];
    setRows(list);
    setDrafts(
      list.reduce<Record<string, string>>((acc, row) => {
        acc[row.id] = row.owner_reply ?? '';
        return acc;
      }, {}),
    );

    const ids = [...new Set(list.map((r) => r.author_id).filter(Boolean))];
    if (!ids.length) {
      setNames({});
      setLoading(false);
      return;
    }

    const { data: profs } = await sb.from('profiles').select('id,display_name').in('id', ids);
    const map: Record<string, string> = {};
    for (const p of profs ?? []) {
      map[p.id as string] = ((p.display_name as string) || '').trim() || 'member';
    }
    setNames(map);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleHidden(row: CommentRow) {
    setBusyId(row.id);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb
      .from('local_shop_guestbook_entries')
      .update({ is_hidden: !row.is_hidden })
      .eq('id', row.id)
      .eq('local_spot_id', id);
    setBusyId(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    await load();
  }

  async function saveReply(row: CommentRow) {
    const reply = (drafts[row.id] ?? '').trim();
    setBusyId(row.id);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb
      .from('local_shop_guestbook_entries')
      .update({
        owner_reply: reply || null,
        owner_reply_at: reply ? new Date().toISOString() : null,
      })
      .eq('id', row.id)
      .eq('local_spot_id', id);
    setBusyId(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg('답글을 저장했습니다.');
    await load();
  }

  async function remove(row: CommentRow) {
    if (!confirm('이 글을 삭제할까요?')) return;
    setBusyId(row.id);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb.from('local_shop_guestbook_entries').delete().eq('id', row.id).eq('local_spot_id', id);
    setBusyId(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg('댓글을 삭제했습니다.');
    await load();
  }

  if (!id) return null;
  if (loading) return <p style={{ color: '#64748b' }}>불러오는 중…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
        가게 방명록/일촌평을 관리하고 오너 답글을 달 수 있습니다.
      </p>
      {msg ? (
        <p style={{ margin: 0, fontSize: 14, color: msg.includes('저장') || msg.includes('삭제') ? '#059669' : '#dc2626' }}>{msg}</p>
      ) : null}

      {rows.length === 0 ? (
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>아직 댓글이 없습니다.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {rows.map((row) => (
            <li key={row.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <strong style={{ fontSize: 14 }}>{names[row.author_id] ?? 'member'}</strong>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {row.entry_kind === 'ilchon' ? '일촌평' : '방명록'} · {formatDate(row.created_at)}
                </span>
              </div>
              {row.is_hidden ? (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#b45309', fontWeight: 700 }}>[숨김 상태]</p>
              ) : null}
              <p style={{ margin: '8px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{row.body}</p>

              <div style={{ marginTop: 10 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>오너 답글</label>
                <textarea
                  value={drafts[row.id] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                  rows={3}
                  maxLength={800}
                  placeholder="답글을 입력해 주세요."
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  최근 답글 시각: {formatDate(row.owner_reply_at)}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void saveReply(row)}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 10px',
                    background: '#7c3aed',
                    color: '#fff',
                    cursor: busyId === row.id ? 'wait' : 'pointer',
                  }}
                >
                  답글 저장
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void toggleHidden(row)}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '6px 10px',
                    background: '#f8fafc',
                    cursor: busyId === row.id ? 'wait' : 'pointer',
                  }}
                >
                  {row.is_hidden ? '다시 보이기' : '숨기기'}
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void remove(row)}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 10px',
                    background: 'rgba(220,38,38,0.12)',
                    color: '#b91c1c',
                    cursor: busyId === row.id ? 'wait' : 'pointer',
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
