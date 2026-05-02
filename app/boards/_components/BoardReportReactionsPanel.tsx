'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type LikedState = { like: boolean; heart: boolean };

export default function BoardReportReactionsPanel({ boardPostId }: { boardPostId: string }) {
  const [likeCount, setLikeCount] = useState(0);
  const [heartCount, setHeartCount] = useState(0);
  const [liked, setLiked] = useState<LikedState>({ like: false, heart: false });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sb = createBrowserClient();
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/board-posts/reactions?board_post_id=${encodeURIComponent(boardPostId)}`, {
        headers,
      });
      const j = (await res.json().catch(() => ({}))) as {
        like_count?: number;
        heart_count?: number;
        liked?: LikedState;
      };
      if (cancelled) return;
      if (res.ok) {
        setLikeCount(j.like_count ?? 0);
        setHeartCount(j.heart_count ?? 0);
        if (j.liked) setLiked(j.liked);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardPostId]);

  async function toggle(kind: 'like' | 'heart') {
    setErr(null);
    setLoading(true);
    try {
      const sb = createBrowserClient();
      const { data: sessData } = await sb.auth.getSession();
      const token = sessData.session?.access_token;
      if (!token) {
        window.location.href = `/auth/login?next=${encodeURIComponent(`/boards/${boardPostId}`)}`;
        return;
      }

      const res = await fetch('/api/board-posts/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ board_post_id: boardPostId, kind }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        like_count?: number;
        heart_count?: number;
        liked?: LikedState;
      };

      if (!res.ok) {
        setErr(j.error ?? `오류 (${res.status})`);
        return;
      }

      setLikeCount(j.like_count ?? likeCount);
      setHeartCount(j.heart_count ?? heartCount);
      if (j.liked) setLiked(j.liked);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">공감</span>
      <button
        type="button"
        disabled={loading}
        onClick={() => void toggle('like')}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          liked.like
            ? 'border-sky-400/50 bg-sky-500/20 text-sky-50'
            : 'border-white/12 bg-white/5 text-slate-200 hover:border-white/25'
        }`}
      >
        👍 {likeCount}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => void toggle('heart')}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          liked.heart
            ? 'border-rose-400/50 bg-rose-500/20 text-rose-50'
            : 'border-white/12 bg-white/5 text-slate-200 hover:border-white/25'
        }`}
      >
        ❤️ {heartCount}
      </button>
      {err ? <span className="text-xs text-rose-300">{err}</span> : null}
    </div>
  );
}
