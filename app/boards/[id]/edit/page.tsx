'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { NewBoardPostForm } from '../../_components/NewBoardPostForm';
import type { BoardPostRow } from '../../_components/types';

export default function EditBoardPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [post, setPost] = useState<BoardPostRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const sb = createBrowserClient();
    void (async () => {
      const { data, error } = await sb.from('board_posts').select('*').eq('id', id).maybeSingle();
      if (error || !data) {
        setErr('글을 찾을 수 없습니다.');
        return;
      }
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user || user.id !== data.user_id) {
        router.replace(`/boards/${id}`);
        return;
      }
      setPost(data as BoardPostRow);
    })();
  }, [id, router]);

  if (err) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-8 text-center text-sm text-red-100">
        {err}
      </div>
    );
  }

  if (!post) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-950/50 p-10 text-center text-sm text-slate-500">
        불러오는 중…
      </div>
    );
  }

  const boardType = post.board_type === 'info' ? 'info' : 'free';

  return (
    <div className="mx-auto max-w-3xl">
      <NewBoardPostForm mode="edit" postId={post.id} boardType={boardType} initial={post} />
    </div>
  );
}
