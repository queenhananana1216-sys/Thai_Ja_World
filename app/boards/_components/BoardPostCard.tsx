'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BoardPostRow } from './types';

type Props = {
  post: BoardPostRow;
  /** 자유 게시판 목록에서만 본인 글 액션 노출 */
  showOwnerActions: boolean;
  currentUserId: string | null;
};

export function BoardPostCard({ post, showOwnerActions, currentUserId }: Props) {
  const router = useRouter();
  const isOwner = currentUserId !== null && post.user_id === currentUserId;
  const preview = post.content.trim().slice(0, 220);
  const thumbs = (post.image_urls ?? []).slice(0, 6);

  async function onDelete() {
    if (!confirm('이 글을 삭제할까요?')) return;
    const { createBrowserClient } = await import('@/lib/supabase/client');
    const sb = createBrowserClient();
    const { data: sess } = await sb.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      router.push(`/auth/login?next=/boards/${post.id}`);
      return;
    }
    const res = await fetch(`/api/boards/${post.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      alert('삭제에 실패했습니다.');
      return;
    }
    window.location.href = `/boards?tab=${
      post.board_type === 'info'
        ? 'info'
        : post.board_type === 'reports'
          ? 'reports'
          : post.board_type === 'tips'
            ? 'tips'
            : 'free'
    }`;
  }

  return (
    <article className="group relative rounded-xl border border-white/12 bg-gradient-to-br from-slate-950/85 via-slate-900/55 to-indigo-950/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition hover:border-amber-400/25">
      {showOwnerActions && isOwner ? (
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <Link
            href={`/boards/${post.id}/edit`}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-100 shadow backdrop-blur-md hover:bg-white/20"
          >
            수정
          </Link>
          <button
            type="button"
            onClick={() => void onDelete()}
            className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-2 py-1 text-[10px] font-bold text-rose-100 backdrop-blur-md hover:bg-rose-500/25"
          >
            삭제
          </button>
        </div>
      ) : null}

      <Link href={`/boards/${post.id}`} className="block no-underline">
        <div className="flex flex-wrap items-center gap-1.5 pr-24">
          <h3 className="text-sm font-bold leading-snug text-slate-50 line-clamp-2 hover:text-amber-100">
            {post.title}
          </h3>
          {post.home_highlight ? (
            <span className="shrink-0 rounded-full border border-orange-400/35 bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-bold text-orange-100">
              🔥 HOT
            </span>
          ) : null}
        </div>
        {post.display_author_label?.trim() ? (
          <p className="mt-1 text-[10px] font-medium text-slate-500">
            {post.display_author_label.trim()}
          </p>
        ) : null}
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 line-clamp-4">{preview}</p>

        {thumbs.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-0.5">
            {thumbs.map((src) => (
              <div
                key={src}
                className="aspect-square overflow-hidden rounded-md border border-white/10 bg-slate-950"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        ) : null}

        {post.board_type === 'info' && post.address ? (
          <p className="mt-2 truncate text-[10px] text-sky-300/90">📍 {post.address}</p>
        ) : null}

        <time className="mt-2 block text-[10px] text-slate-600" dateTime={post.created_at}>
          {new Date(post.created_at).toLocaleString('ko-KR')}
        </time>
      </Link>
    </article>
  );
}
