'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { BoardPostCard } from './BoardPostCard';
import type { BoardPostRow } from './types';

type Tab = 'free' | 'info';

export function BoardPostList({ tab }: { tab: Tab }) {
  const [posts, setPosts] = useState<BoardPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const sb = createBrowserClient();
    void sb.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const res = await fetch(`/api/boards?board_type=${tab}&limit=48`);
        const json = (await res.json()) as { posts?: BoardPostRow[]; error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? 'load_failed');
        }
        if (!cancelled) setPosts(json.posts ?? []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-8 text-center text-sm text-slate-500 backdrop-blur-md">
        불러오는 중…
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-6 text-sm text-red-100">
        목록을 불러오지 못했습니다.
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-slate-950/30 p-10 text-center text-sm text-slate-500">
        아직 게시글이 없습니다. 첫 글을 남겨 보세요.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {posts.map((p) => (
        <BoardPostCard
          key={p.id}
          post={p}
          showOwnerActions={tab === 'free'}
          currentUserId={userId}
        />
      ))}
    </div>
  );
}
