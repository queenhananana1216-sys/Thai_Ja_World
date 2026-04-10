'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import { boardModMessage } from '@/lib/community/moderationMessages';
import { createBrowserClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatDate';

export type NewsCommentRow = {
  id: string;
  content: string;
  created_at: string;
  display_name: string;
  author_id: string;
};

export default function NewsComments({
  processedNewsId,
  initial,
  labels,
  loginNextPath,
  currentUserId,
}: {
  processedNewsId: string;
  initial: NewsCommentRow[];
  labels: Dictionary['board'];
  loginNextPath: string;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  async function getToken() {
    const sb = createBrowserClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(loginNextPath)}`);
      return null;
    }
    const { data: sess } = await sb.auth.getSession();
    return sess.session?.access_token ?? null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const text = body.trim();
    if (text.length < 1) return;
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    const res = await fetch('/api/news/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ processed_news_id: processedNewsId, content: text }),
    });
    let payload: { code?: string; message?: string } = {};
    try { payload = (await res.json()) as typeof payload; } catch { /* ignore */ }
    setLoading(false);
    if (!res.ok) {
      setError(payload.message?.trim() ? payload.message : boardModMessage(labels, payload.code));
      return;
    }
    setBody('');
    router.refresh();
  }

  async function onDelete(commentId: string) {
    if (!confirm('댓글을 삭제할까요?')) return;
    setActionBusy(commentId);
    const sb = createBrowserClient();
    const { error: delErr } = await sb.from('news_comments').delete().eq('id', commentId);
    setActionBusy(null);
    if (delErr) {
      setError('삭제에 실패했어요.');
      return;
    }
    router.refresh();
  }

  async function onEditSave(commentId: string) {
    const text = editBody.trim();
    if (text.length < 1) return;
    setActionBusy(commentId);
    const sb = createBrowserClient();
    const { error: upErr } = await sb
      .from('news_comments')
      .update({ content: text })
      .eq('id', commentId);
    setActionBusy(null);
    if (upErr) {
      setError('수정에 실패했어요.');
      return;
    }
    setEditingId(null);
    setEditBody('');
    router.refresh();
  }

  return (
    <section className="board-comments">
      <h3 style={{ fontSize: '1rem', marginTop: 0 }}>{labels.comments}</h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {initial.map((c) => {
          const isMine = currentUserId === c.author_id;
          const isEditing = editingId === c.id;
          const busy = actionBusy === c.id;
          return (
            <li key={c.id} className="board-comment">
              <div className="board-comment__meta">
                {c.display_name} · {formatDate(c.created_at)}
                {isMine && !isEditing && (
                  <span className="board-comment__actions">
                    <button
                      type="button"
                      className="board-comment__action-btn"
                      disabled={busy}
                      onClick={() => { setEditingId(c.id); setEditBody(c.content); }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="board-comment__action-btn board-comment__action-btn--del"
                      disabled={busy}
                      onClick={() => void onDelete(c.id)}
                    >
                      {busy ? '...' : '삭제'}
                    </button>
                  </span>
                )}
              </div>
              {isEditing ? (
                <div style={{ marginTop: 6 }}>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    style={{ minHeight: 60, width: '100%', marginBottom: 6 }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="board-form__submit"
                      style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                      disabled={busy}
                      onClick={() => void onEditSave(c.id)}
                    >
                      {busy ? '...' : '저장'}
                    </button>
                    <button
                      type="button"
                      className="board-comment__action-btn"
                      onClick={() => { setEditingId(null); setEditBody(''); }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
              )}
            </li>
          );
        })}
      </ul>
      {initial.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--tj-muted)' }}>—</p>
      )}

      <form className="board-form" onSubmit={(e) => void onSubmit(e)} style={{ marginTop: 16 }}>
        <label htmlFor="news-cbody">{labels.commentBody}</label>
        <textarea
          id="news-cbody"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ minHeight: 88, marginBottom: 8 }}
        />
        {error && <p style={{ color: '#be185d', fontSize: '0.82rem' }}>{error}</p>}
        <button type="submit" className="board-form__submit" disabled={loading}>
          {loading ? '…' : labels.sendComment}
        </button>
      </form>
    </section>
  );
}
