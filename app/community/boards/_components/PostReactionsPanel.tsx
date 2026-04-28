'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type LikedState = { like: boolean; heart: boolean };

export default function PostReactionsPanel({
  postId,
  loginNextPath,
}: {
  postId: string;
  loginNextPath: string;
}) {
  const [likeCount, setLikeCount] = useState(0);
  const [heartCount, setHeartCount] = useState(0);
  const [liked, setLiked] = useState<LikedState>({ like: false, heart: false });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fetchState() {
    setErr(null);
    const sb = createBrowserClient();
    const { data: sessData } = await sb.auth.getSession();
    const token = sessData.session?.access_token;

    const res = await fetch(`/api/community/reactions?post_id=${encodeURIComponent(postId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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

    setLikeCount(j.like_count ?? 0);
    setHeartCount(j.heart_count ?? 0);
    if (j.liked) setLiked(j.liked);
  }

  useEffect(() => {
    void fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function toggle(kind: 'like' | 'heart') {
    setErr(null);
    setLoading(true);
    try {
      const sb = createBrowserClient();
      const { data: sessData } = await sb.auth.getSession();
      const token = sessData.session?.access_token;
      if (!token) {
        // 로그인 요구(댓글 UI와 동일 UX)
        window.location.href = `/auth/login?next=${encodeURIComponent(loginNextPath)}`;
        return;
      }

      const res = await fetch('/api/community/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ post_id: postId, kind }),
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

  const likeActive = liked.like;
  const heartActive = liked.heart;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {err ? (
        <span className="mr-2 text-xs font-semibold text-rose-300">{err}</span>
      ) : null}

      <button
        type="button"
        onClick={() => void toggle('like')}
        disabled={loading}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          likeActive
            ? 'border-violet-300/70 bg-linear-to-r from-violet-500 to-violet-400 text-white'
            : 'border-white/15 bg-slate-800/60 text-slate-100 hover:bg-slate-800/85'
        } disabled:cursor-wait disabled:opacity-70`}
      >
        좋아요 {likeCount > 0 ? `(${likeCount})` : ''}
      </button>

      <button
        type="button"
        onClick={() => void toggle('heart')}
        disabled={loading}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          heartActive
            ? 'border-pink-300/70 bg-linear-to-r from-pink-500 to-fuchsia-500 text-white'
            : 'border-white/15 bg-slate-800/60 text-slate-100 hover:bg-slate-800/85'
        } disabled:cursor-wait disabled:opacity-70`}
      >
        공감 {heartCount > 0 ? `(${heartCount})` : ''}
      </button>
    </div>
  );
}

