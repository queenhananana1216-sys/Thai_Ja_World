'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { Dictionary } from '@/i18n/dictionaries';
import { boardModMessage } from '@/lib/community/moderationMessages';
import { createBrowserClient } from '@/lib/supabase/client';
import { requestThaiBalanceRefetch } from '@/lib/thaiBalanceBroadcast';
import { formatDate } from '@/lib/utils/formatDate';

const FUNNEL_MSG = '로그인 후 이용할 수 있는 기능입니다.' as const;

export type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  display_name: string;
  parent_comment_id: string | null;
};

type ReplyTarget = { id: string; name: string };

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
  const [expanded, setExpanded] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  const childrenMap = new Map<string, CommentRow[]>();
  const roots: CommentRow[] = [];
  const commentIds = new Set(initial.map((c) => c.id));
  for (const c of initial) {
    if (!c.parent_comment_id || !commentIds.has(c.parent_comment_id)) roots.push(c);
    else {
      const arr = childrenMap.get(c.parent_comment_id) ?? [];
      arr.push(c);
      childrenMap.set(c.parent_comment_id, arr);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      toast.error(FUNNEL_MSG, { position: 'top-center' });
      router.push('/login');
      return;
    }
    const text = body.trim();
    if (text.length < 1) return;
    const { data: sess } = await sb.auth.getSession();
    const accessToken = sess.session?.access_token;
    if (!accessToken) {
      setError(labels.mod.auth);
      toast.error(FUNNEL_MSG, { position: 'top-center' });
      router.push('/login');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/community/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        post_id: postId,
        content: text,
        parent_comment_id: replyTarget?.id ?? null,
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
      setError(
        payload.message?.trim()
          ? payload.message
          : boardModMessage(labels, payload.code),
      );
      return;
    }
    setBody('');
    setReplyTarget(null);
    setExpanded(false);
    requestThaiBalanceRefetch();
    router.refresh();
  }

  function renderTree(comment: CommentRow, depth: number) {
    const children = childrenMap.get(comment.id) ?? [];
    const depthClass = depth > 0 ? 'ml-6 border-l-2 border-l-violet-300/40 pl-4' : '';

    return (
      <li key={comment.id} className={`rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2 ${depthClass}`}>
        <div className="text-xs font-medium text-slate-300/90">
          {depth > 0 ? <span className="mr-1 text-slate-400">↳</span> : null}
          {comment.display_name} · {formatDate(comment.created_at)}
        </div>
        <div className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{comment.content}</div>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <button type="button" className="text-slate-400 transition hover:text-white">좋아요 👍</button>
          <button
            type="button"
            className="text-slate-400 transition hover:text-white"
            onClick={() => {
              void (async () => {
                const sb = createBrowserClient();
                const {
                  data: { user },
                } = await sb.auth.getUser();
                if (!user) {
                  toast.error(FUNNEL_MSG, { position: 'top-center' });
                  router.push('/login');
                  return;
                }
                setReplyTarget({ id: comment.id, name: comment.display_name });
                setExpanded(true);
                const textarea = document.getElementById('cbody') as HTMLTextAreaElement | null;
                textarea?.focus();
              })();
            }}
          >
            답글 달기 💬
          </button>
        </div>
        {children.length > 0 ? (
          <ul className="m-0 mt-2 list-none space-y-2 p-0">
            {children.map((child) => renderTree(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-[0_10px_35px_rgba(2,6,23,0.45)] backdrop-blur-md">
      <h3 className="m-0 text-base font-bold text-slate-100">{labels.comments}</h3>
      <ul className="m-0 mt-3 list-none space-y-2 p-0">
        {roots.map((root) => renderTree(root, 0))}
      </ul>
      {initial.length === 0 && (
        <p className="mt-3 text-xs text-slate-400">첫 댓글을 남겨주세요.</p>
      )}

      <form className="board-form mt-4" onSubmit={(e) => void onSubmit(e)}>
        <label htmlFor="cbody" className="text-sm font-semibold text-slate-200">
          댓글을 남겨주세요
        </label>
        {replyTarget ? (
          <p className="mt-1 text-xs text-violet-200">답글 대상: {replyTarget.name}</p>
        ) : null}
        <textarea
          id="cbody"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => {
            if (showLoginHint) {
              toast.error(FUNNEL_MSG, { position: 'top-center' });
              router.push('/login');
              return;
            }
            setExpanded(true);
          }}
          placeholder={labels.commentBody}
          className={`mt-2 w-full rounded-xl border border-white/15 bg-slate-950/70 p-3 text-sm text-slate-100 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-300/60 ${
            expanded ? 'min-h-28' : 'min-h-12'
          }`}
        />
        {error && <p className="mt-2 text-xs font-medium text-rose-300">{error}</p>}
        {expanded ? (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-full border border-violet-300/50 bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading ? '…' : labels.sendComment}
            </button>
            <button
              type="button"
              className="rounded-full border border-white/15 bg-slate-800 px-3 py-2 text-xs text-slate-300"
              onClick={() => {
                setExpanded(false);
                setReplyTarget(null);
              }}
              disabled={loading}
            >
              닫기
            </button>
          </div>
        ) : null}
      </form>
      {showLoginHint ? (
        <p className="mt-2 text-xs text-slate-400">{labels.loginForComment}</p>
      ) : null}
    </section>
  );
}
