'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatDate';

export type BoardReportCommentRow = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  parent_comment_id: string | null;
  display_name: string;
};

const FUNNEL_MSG = '로그인 후 댓글을 남길 수 있습니다.' as const;

export default function BoardReportComments({
  boardPostId,
  initial,
  showLoginHint,
}: {
  boardPostId: string;
  initial: BoardReportCommentRow[];
  showLoginHint: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);

  const loginNext = `/boards/${boardPostId}`;

  const childrenMap = useMemo(() => {
    const m = new Map<string, BoardReportCommentRow[]>();
    for (const c of initial) {
      const pid = c.parent_comment_id;
      if (!pid) continue;
      const arr = m.get(pid) ?? [];
      arr.push(c);
      m.set(pid, arr);
    }
    return m;
  }, [initial]);

  const roots = useMemo(() => initial.filter((c) => !c.parent_comment_id), [initial]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      toast.error(FUNNEL_MSG, { position: 'top-center' });
      router.push(`/auth/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }
    const text = body.trim();
    if (text.length < 1) return;
    const { data: sess } = await sb.auth.getSession();
    const accessToken = sess.session?.access_token;
    if (!accessToken) {
      toast.error(FUNNEL_MSG, { position: 'top-center' });
      router.push(`/auth/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }
    setLoading(true);
    const res = await fetch('/api/board-posts/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        board_post_id: boardPostId,
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
      setError(payload.message?.trim() ? payload.message : payload.code ?? `오류 (${res.status})`);
      return;
    }
    setBody('');
    setReplyTarget(null);
    setExpanded(false);
    router.refresh();
  }

  function renderTree(comment: BoardReportCommentRow, depth: number) {
    const children = childrenMap.get(comment.id) ?? [];
    const depthClass = depth > 0 ? 'ml-5 border-l border-l-violet-400/30 pl-3' : '';

    return (
      <li
        key={comment.id}
        className={`rounded-xl border border-white/10 bg-slate-900/55 px-3 py-2 ${depthClass}`}
      >
        <div className="text-[11px] font-medium text-slate-400">
          {depth > 0 ? <span className="mr-1 text-slate-500">↳</span> : null}
          {comment.display_name} · {formatDate(comment.created_at)}
        </div>
        <div className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{comment.content}</div>
        <div className="mt-2 flex items-center gap-3 text-[11px]">
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
                  router.push(`/auth/login?next=${encodeURIComponent(loginNext)}`);
                  return;
                }
                setReplyTarget({ id: comment.id, name: comment.display_name });
                setExpanded(true);
                const textarea = document.getElementById('board-report-cbody') as HTMLTextAreaElement | null;
                textarea?.focus();
              })();
            }}
          >
            답글
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
    <section className="mt-8 border-t border-white/10 pt-6">
      <h3 className="m-0 text-sm font-black uppercase tracking-widest text-violet-200/90">댓글</h3>
      <ul className="m-0 mt-3 list-none space-y-2 p-0">
        {roots.map((root) => renderTree(root, 0))}
      </ul>
      {initial.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">첫 댓글을 남겨 주세요. 검증된 제보에 대한 의견만 부탁드립니다.</p>
      ) : null}

      <form className="mt-4" onSubmit={(e) => void onSubmit(e)}>
        <label htmlFor="board-report-cbody" className="text-xs font-semibold text-slate-200">
          댓글 작성
        </label>
        {replyTarget ? (
          <p className="mt-1 text-[11px] text-violet-200/90">답글 대상: {replyTarget.name}</p>
        ) : null}
        <textarea
          id="board-report-cbody"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => {
            if (showLoginHint) {
              toast.error(FUNNEL_MSG, { position: 'top-center' });
              router.push(`/auth/login?next=${encodeURIComponent(loginNext)}`);
              return;
            }
            setExpanded(true);
          }}
          placeholder="예: 추가 정보나 현장 상황을 알려 주세요."
          className={`mt-2 w-full rounded-xl border border-white/15 bg-slate-950/70 p-3 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-violet-400/50 ${
            expanded ? 'min-h-28' : 'min-h-12'
          }`}
        />
        {error ? <p className="mt-2 text-xs font-medium text-rose-300">{error}</p> : null}
        {expanded ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-full border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-50 hover:bg-violet-500/30 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? '…' : '등록'}
            </button>
            <button
              type="button"
              className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10"
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
      {showLoginHint ? <p className="mt-2 text-[11px] text-slate-500">로그인하면 댓글을 남길 수 있습니다.</p> : null}
    </section>
  );
}
