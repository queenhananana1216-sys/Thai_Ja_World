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
    <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      {err ? (
        <span style={{ color: '#b91c1c', fontSize: 12, fontWeight: 600, marginRight: 8 }}>{err}</span>
      ) : null}

      <button
        type="button"
        onClick={() => void toggle('like')}
        disabled={loading}
        style={{
          padding: '6px 12px',
          borderRadius: 999,
          border: `1px solid ${likeActive ? 'rgba(124, 58, 237, 0.6)' : 'rgba(228, 220, 232, 0.7)'}`,
          background: likeActive ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : 'rgba(255,255,255,0.65)',
          color: likeActive ? '#fff' : '#4a4458',
          cursor: loading ? 'wait' : 'pointer',
          fontWeight: 800,
          fontSize: 12,
        }}
      >
        좋아요 {likeCount > 0 ? `(${likeCount})` : ''}
      </button>

      <button
        type="button"
        onClick={() => void toggle('heart')}
        disabled={loading}
        style={{
          padding: '6px 12px',
          borderRadius: 999,
          border: `1px solid ${heartActive ? 'rgba(236, 72, 153, 0.55)' : 'rgba(228, 220, 232, 0.7)'}`,
          background: heartActive ? 'linear-gradient(135deg, #ec4899, #f472b6)' : 'rgba(255,255,255,0.65)',
          color: heartActive ? '#fff' : '#4a4458',
          cursor: loading ? 'wait' : 'pointer',
          fontWeight: 800,
          fontSize: 12,
        }}
      >
        공감 {heartCount > 0 ? `(${heartCount})` : ''}
      </button>
    </div>
  );
}

