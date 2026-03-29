'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import { boardModMessage } from '@/lib/community/moderationMessages';
import { createBrowserClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatDate';

export type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  display_name: string;
};

export default function PostComments({
  postId,
  initial,
  labels,
  loginNextPath,
  showLoginHint = true,
}: {
  postId: string;
  initial: CommentRow[];
  labels: Dictionary['board'];
  loginNextPath: string;
  /** 로그인 상태면 안내 문구 숨김 */
  showLoginHint?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(loginNextPath)}`);
      return;
    }
    const text = body.trim();
    if (text.length < 1) return;
    const { data: sess } = await sb.auth.getSession();
    const accessToken = sess.session?.access_token;
    if (!accessToken) {
      setError(labels.mod.auth);
      router.push(`/auth/login?next=${encodeURIComponent(loginNextPath)}`);
      return;
    }
    setLoading(true);
    const res = await fetch('/api/community/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ post_id: postId, content: text }),
    });
    let payload: { code?: string; message?: string } = {};
    try {
      payload = (await res.json()) as typeof payload;
    } catch {
      /* ignore */
    }
    setLoading(false);
    if (!res.ok) {
      setError(
        payload.message?.trim()
          ? payload.message
          : boardModMessage(labels, payload.code),
      );
      return;
    }
    setBody('');
    router.refresh();
  }

  return (
    <section className="board-comments">
      <h3 style={{ fontSize: '1rem', marginTop: 0 }}>{labels.comments}</h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {initial.map((c) => (
          <li key={c.id} className="board-comment">
            <div className="board-comment__meta">
              {c.display_name} · {formatDate(c.created_at)}
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
          </li>
        ))}
      </ul>
      {initial.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--tj-muted)' }}>—</p>
      )}

      <form className="board-form" onSubmit={(e) => void onSubmit(e)} style={{ marginTop: 16 }}>
        <label htmlFor="cbody">{labels.commentBody}</label>
        <textarea
          id="cbody"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ minHeight: 88, marginBottom: 8 }}
        />
        {error && <p style={{ color: '#be185d', fontSize: '0.82rem' }}>{error}</p>}
        <button type="submit" className="board-form__submit" disabled={loading}>
          {loading ? '…' : labels.sendComment}
        </button>
      </form>
      {showLoginHint ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--tj-muted)', marginTop: 8 }}>
          {labels.loginForComment}
        </p>
      ) : null}
    </section>
  );
}
