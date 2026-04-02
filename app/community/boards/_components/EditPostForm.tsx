'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import { boardModMessage } from '@/lib/community/moderationMessages';
import { createBrowserClient } from '@/lib/supabase/client';

export default function EditPostForm({
  postId,
  initialTitle,
  initialContent,
  ownerGateSet,
  board,
}: {
  postId: string;
  initialTitle: string;
  initialContent: string;
  ownerGateSet: boolean;
  board: Dictionary['board'];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (ownerGateSet && !ownerPassword.trim()) {
      setError(board.postOwnerPasswordRequired);
      return;
    }
    setLoading(true);
    const sb = createBrowserClient();
    const { data: sess } = await sb.auth.getSession();
    const accessToken = sess.session?.access_token;
    if (!accessToken) {
      setLoading(false);
      router.push(`/auth/login?next=/community/boards/${postId}/edit`);
      return;
    }

    const res = await fetch(`/api/community/posts/${postId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        title: title.trim(),
        content: content.trim(),
        owner_password: ownerGateSet ? ownerPassword : undefined,
      }),
    });

    let payload: { code?: string; message?: string } = {};
    try {
      payload = (await res.json()) as typeof payload;
    } catch {
      /* ignore */
    }

    setLoading(false);
    if (!res.ok) {
      if (payload.code === 'owner_password_required') {
        setError(board.postOwnerPasswordRequired);
        return;
      }
      if (payload.code === 'owner_password_invalid') {
        setError(board.postOwnerPasswordWrong);
        return;
      }
      setError(
        payload.message?.trim()
          ? payload.message
          : boardModMessage(board, payload.code),
      );
      return;
    }
    router.push(`/community/boards/${postId}`);
    router.refresh();
  }

  return (
    <form className="board-form" onSubmit={(e) => void onSubmit(e)}>
      <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--tj-muted)' }}>
        <Link href={`/community/boards/${postId}`} style={{ color: 'var(--tj-link)' }}>
          ← {board.backToList}
        </Link>
      </p>

      <label htmlFor="ep-title">{board.title}</label>
      <input
        id="ep-title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        required
      />

      <label htmlFor="ep-body">{board.body}</label>
      <textarea
        id="ep-body"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        minLength={2}
      />

      {ownerGateSet ? (
        <>
          <label htmlFor="ep-pw">{board.postOwnerPasswordPlaceholder}</label>
          <input
            id="ep-pw"
            type="password"
            autoComplete="off"
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            placeholder={board.postOwnerPasswordPlaceholder}
            required
          />
        </>
      ) : null}

      {error && <p style={{ color: '#be185d', fontSize: '0.86rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
        <button type="submit" className="board-form__submit" disabled={loading}>
          {loading ? board.postBusy : board.editSave}
        </button>
        <Link
          href={`/community/boards/${postId}`}
          className="board-form__submit"
          style={{
            textAlign: 'center',
            background: 'var(--tj-line)',
            color: 'var(--tj-ink)',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          {board.editCancel}
        </Link>
      </div>
    </form>
  );
}
