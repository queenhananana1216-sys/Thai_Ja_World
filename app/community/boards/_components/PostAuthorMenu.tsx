'use client';

import { useRouter } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import { createBrowserClient } from '@/lib/supabase/client';

type Labels = Pick<
  Dictionary['board'],
  | 'postOwnerMenu'
  | 'postDelete'
  | 'postMakePrivate'
  | 'postMakePublic'
  | 'postDeleteConfirm'
  | 'postBusy'
  | 'postActionError'
>;

export default function PostAuthorMenu({
  postId,
  authorHidden,
  labels,
  listLayout,
}: {
  postId: string;
  authorHidden: boolean;
  labels: Labels;
  /** 목록 카드에서는 작은 절대 위치 */
  listLayout?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function getToken(): Promise<string | null> {
    const sb = createBrowserClient();
    const { data: sess } = await sb.auth.getSession();
    return sess.session?.access_token ?? null;
  }

  async function patchHidden(next: boolean) {
    setErr(null);
    setBusy(true);
    const token = await getToken();
    if (!token) {
      setBusy(false);
      setErr(labels.postActionError);
      return;
    }
    const res = await fetch(`/api/community/posts/${postId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ author_hidden: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr(labels.postActionError);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function runDelete() {
    if (!window.confirm(labels.postDeleteConfirm)) return;
    setErr(null);
    setBusy(true);
    const token = await getToken();
    if (!token) {
      setBusy(false);
      setErr(labels.postActionError);
      return;
    }
    const res = await fetch(`/api/community/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusy(false);
    if (!res.ok) {
      setErr(labels.postActionError);
      return;
    }
    setOpen(false);
    router.push('/community/boards');
    router.refresh();
  }

  const wrapStyle: CSSProperties = listLayout
    ? { position: 'absolute', top: 10, right: 10, zIndex: 2 }
    : { marginBottom: 10 };

  return (
    <div className="post-owner-menu" style={wrapStyle}>
      <button
        type="button"
        className="post-owner-menu__toggle"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
      >
        {labels.postOwnerMenu}
      </button>
      {open && (
        <ul className="post-owner-menu__dropdown" role="menu">
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="post-owner-menu__item"
              disabled={busy}
              onClick={() => void patchHidden(!authorHidden)}
            >
              {authorHidden ? labels.postMakePublic : labels.postMakePrivate}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="post-owner-menu__item post-owner-menu__item--danger"
              disabled={busy}
              onClick={() => void runDelete()}
            >
              {labels.postDelete}
            </button>
          </li>
        </ul>
      )}
      {busy ? <p className="post-owner-menu__hint">{labels.postBusy}</p> : null}
      {err ? <p className="post-owner-menu__err">{err}</p> : null}
    </div>
  );
}
