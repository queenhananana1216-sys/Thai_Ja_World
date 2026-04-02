'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export type AdminPostRow = {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  created_at: string;
  moderation_status: string;
};

export default function AdminCommunityPostsClient({ initial }: { initial: AdminPostRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function runDelete(postId: string) {
    if (!confirm('이 게시글을 삭제할까요? 댓글·반응은 함께 삭제됩니다.')) return;
    setMsg(null);
    setBusyId(postId);
    const sb = createBrowserClient();
    const { data: sess } = await sb.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      setMsg('세션이 없습니다. 다시 로그인해 주세요.');
      setBusyId(null);
      return;
    }
    const res = await fetch(`/api/community/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusyId(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { code?: string };
      setMsg(j.code === 'forbidden' ? '권한이 없습니다.' : `삭제 실패 (${res.status})`);
      return;
    }
    router.refresh();
  }

  if (initial.length === 0) {
    return <p className="admin-dash__lead">표시할 게시글이 없습니다.</p>;
  }

  return (
    <div>
      {msg ? (
        <p className="admin-dash__alert" style={{ marginBottom: 12 }}>
          {msg}
        </p>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '8px 6px' }}>말머리</th>
              <th style={{ padding: '8px 6px' }}>제목</th>
              <th style={{ padding: '8px 6px' }}>상태</th>
              <th style={{ padding: '8px 6px' }}>작성일</th>
              <th style={{ padding: '8px 6px' }}>동작</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>{p.categoryLabel}</td>
                <td style={{ padding: '8px 6px', maxWidth: 360 }}>
                  <Link
                    href={`/community/boards/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#7c3aed' }}
                  >
                    {p.title}
                  </Link>
                </td>
                <td style={{ padding: '8px 6px' }}>{p.moderation_status}</td>
                <td style={{ padding: '8px 6px', whiteSpace: 'nowrap', color: '#64748b' }}>
                  {p.created_at.slice(0, 16).replace('T', ' ')}
                </td>
                <td style={{ padding: '8px 6px' }}>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => void runDelete(p.id)}
                    style={{
                      padding: '6px 10px',
                      fontSize: 12,
                      borderRadius: 6,
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      color: '#b91c1c',
                      cursor: busyId === p.id ? 'wait' : 'pointer',
                    }}
                  >
                    {busyId === p.id ? '삭제 중…' : '삭제'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
