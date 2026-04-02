'use client';

import Link from 'next/link';
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
  | 'postEdit'
  | 'postOwnerPasswordPrompt'
  | 'postOwnerPasswordPlaceholder'
  | 'postOwnerPasswordSubmit'
  | 'postOwnerPasswordCancel'
  | 'postOwnerPasswordRequired'
  | 'postOwnerPasswordWrong'
>;

export default function PostAuthorMenu({
  postId,
  authorHidden,
  ownerGateSet,
  labels,
  listLayout,
}: {
  postId: string;
  authorHidden: boolean;
  /** 글 비밀번호가 설정된 글 — 삭제·비공개 전환 시 입력 필요 */
  ownerGateSet: boolean;
  labels: Labels;
  listLayout?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateAction, setGateAction] = useState<'patch' | 'delete' | null>(null);
  const [patchNextHidden, setPatchNextHidden] = useState(false);
  const [gatePassword, setGatePassword] = useState('');

  async function getToken(): Promise<string | null> {
    const sb = createBrowserClient();
    const { data: sess } = await sb.auth.getSession();
    return sess.session?.access_token ?? null;
  }

  function mapApiErr(code: string | undefined): string {
    if (code === 'owner_password_required') return labels.postOwnerPasswordRequired;
    if (code === 'owner_password_invalid') return labels.postOwnerPasswordWrong;
    return labels.postActionError;
  }

  async function patchHidden(next: boolean, owner_password?: string) {
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
      body: JSON.stringify({ author_hidden: next, owner_password }),
    });
    setBusy(false);
    let code: string | undefined;
    try {
      const j = (await res.json()) as { code?: string };
      code = j.code;
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      setErr(mapApiErr(code));
      return;
    }
    setOpen(false);
    setGateOpen(false);
    setGatePassword('');
    setGateAction(null);
    router.refresh();
  }

  async function runDelete(owner_password?: string) {
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(owner_password ? { owner_password } : {}),
    });
    setBusy(false);
    let code: string | undefined;
    try {
      const j = (await res.json()) as { code?: string };
      code = j.code;
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      setErr(mapApiErr(code));
      return;
    }
    setOpen(false);
    setGateOpen(false);
    setGatePassword('');
    setGateAction(null);
    router.push('/community/boards');
    router.refresh();
  }

  function startPatchHidden(next: boolean) {
    setErr(null);
    if (ownerGateSet) {
      setPatchNextHidden(next);
      setGateAction('patch');
      setGatePassword('');
      setGateOpen(true);
      setOpen(false);
    } else {
      void patchHidden(next);
    }
  }

  function startDelete() {
    if (!window.confirm(labels.postDeleteConfirm)) return;
    setErr(null);
    if (ownerGateSet) {
      setGateAction('delete');
      setGatePassword('');
      setGateOpen(true);
      setOpen(false);
    } else {
      void runDelete();
    }
  }

  function submitGate() {
    const pwd = gatePassword.trim();
    if (ownerGateSet && !pwd) {
      setErr(labels.postOwnerPasswordRequired);
      return;
    }
    setErr(null);
    if (gateAction === 'patch') {
      void patchHidden(patchNextHidden, pwd || undefined);
    } else if (gateAction === 'delete') {
      void runDelete(pwd || undefined);
    }
  }

  const wrapStyle: CSSProperties = listLayout
    ? { position: 'absolute', top: 10, right: 10, zIndex: 25 }
    : { marginBottom: 10 };

  return (
    <div className="post-owner-menu" style={wrapStyle}>
      <button
        type="button"
        className="post-owner-menu__toggle"
        aria-expanded={open ? 'true' : 'false'}
        aria-haspopup="menu"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
      >
        {labels.postOwnerMenu}
      </button>
      {open && (
        <ul className="post-owner-menu__dropdown" role="menu">
          <li role="none">
            <Link
              href={`/community/boards/${postId}/edit`}
              className="post-owner-menu__item"
              role="menuitem"
              style={{ display: 'block', textDecoration: 'none' }}
              onClick={() => setOpen(false)}
            >
              {labels.postEdit}
            </Link>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="post-owner-menu__item"
              disabled={busy}
              onClick={() => startPatchHidden(!authorHidden)}
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
              onClick={() => startDelete()}
            >
              {labels.postDelete}
            </button>
          </li>
        </ul>
      )}
      {busy ? <p className="post-owner-menu__hint">{labels.postBusy}</p> : null}
      {err && !gateOpen ? <p className="post-owner-menu__err">{err}</p> : null}

      {gateOpen ? (
        <div className="post-owner-gate" role="dialog" aria-modal="true">
          <div className="post-owner-gate__panel">
            <p className="post-owner-gate__lead">{labels.postOwnerPasswordPrompt}</p>
            <input
              type="password"
              autoComplete="off"
              value={gatePassword}
              onChange={(e) => setGatePassword(e.target.value)}
              placeholder={labels.postOwnerPasswordPlaceholder}
              className="post-owner-gate__input"
            />
            {err && gateOpen ? <p className="post-owner-menu__err">{err}</p> : null}
            <div className="post-owner-gate__actions">
              <button type="button" className="post-owner-gate__btn" disabled={busy} onClick={() => submitGate()}>
                {labels.postOwnerPasswordSubmit}
              </button>
              <button
                type="button"
                className="post-owner-gate__btn post-owner-gate__btn--ghost"
                disabled={busy}
                onClick={() => {
                  setGateOpen(false);
                  setGateAction(null);
                  setGatePassword('');
                  setErr(null);
                }}
              >
                {labels.postOwnerPasswordCancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
