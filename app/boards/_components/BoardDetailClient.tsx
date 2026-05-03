'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import BoardReportComments, { type BoardReportCommentRow } from './BoardReportComments';
import BoardReportReactionsPanel from './BoardReportReactionsPanel';
import { MiniMapView } from './MiniMapView';
import type { BoardPostRow } from './types';
import { BlurThumbImage } from '@/components/media/BlurThumbImage';

export function BoardDetailClient({
  post,
  reportComments = [],
}: {
  post: BoardPostRow;
  reportComments?: BoardReportCommentRow[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void createBrowserClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const isOwner = userId !== null && userId === post.user_id;
  const showFreeActions = post.board_type === 'free' && isOwner;
  const imgs = post.image_urls ?? [];
  const hasGeo =
    post.board_type === 'info' && post.lat != null && post.lng != null;
  const isReports = post.board_type === 'reports';
  const isTips = post.board_type === 'tips';

  async function onDelete() {
    if (!confirm('이 글을 삭제할까요?')) return;
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

  const listTab = isReports ? 'reports' : isTips ? 'tips' : post.board_type === 'info' ? 'info' : 'free';

  return (
    <article className="rounded-2xl border border-white/15 bg-gradient-to-b from-slate-950/95 to-slate-900/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-6">
      {showFreeActions ? (
        <div className="mb-4 flex justify-end gap-2">
          <Link
            href={`/boards/${post.id}/edit`}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-100 backdrop-blur-md hover:bg-white/20"
          >
            수정
          </Link>
          <button
            type="button"
            onClick={() => void onDelete()}
            className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-1.5 text-[11px] font-bold text-rose-100 backdrop-blur-md hover:bg-rose-500/25"
          >
            삭제
          </button>
        </div>
      ) : null}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={
            post.board_type === 'info'
              ? 'rounded-full border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-100'
              : isTips
                ? 'rounded-full border border-teal-400/35 bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold text-teal-100'
                : isReports
                  ? 'rounded-full border border-rose-400/35 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-100'
                  : 'rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-100'
          }
        >
          {post.board_type === 'info'
            ? '정보 공유'
            : isTips
              ? '생활·여행 팁'
              : isReports
                ? '검증 제보'
                : '자유 게시판'}
        </span>
        {post.home_highlight ? (
          <span className="rounded-full border border-orange-400/40 bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-100">
            🔥 HOT
          </span>
        ) : null}
        <time className="text-[10px] text-slate-500" dateTime={post.created_at}>
          {new Date(post.created_at).toLocaleString('ko-KR')}
        </time>
      </div>

      <h1 className="text-xl font-black tracking-tight text-slate-50 sm:text-2xl">{post.title}</h1>

      {post.display_author_label?.trim() ? (
        <p className="mt-2 text-xs font-medium text-slate-400">
          작성 표시 — <span className="text-slate-200">{post.display_author_label.trim()}</span>
        </p>
      ) : null}

      <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-200/95 [text-wrap:pretty]">
        {post.content}
      </div>

      {imgs.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            이미지
          </p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
            {imgs.map((src, ii) => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-square overflow-hidden rounded-lg border border-white/10 bg-slate-950 shadow-inner"
              >
                <BlurThumbImage
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 45vw, 200px"
                  priority={ii === 0}
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {hasGeo ? (
        <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300/90">
            위치
          </p>
          {post.address ? (
            <p className="text-sm leading-snug text-slate-200">{post.address}</p>
          ) : (
            <p className="text-xs text-slate-500">주소 정보 없음 (좌표만 저장됨)</p>
          )}
          <MiniMapView lat={post.lat!} lng={post.lng!} height={240} />
        </div>
      ) : null}

      {isReports ? (
        <>
          <BoardReportReactionsPanel boardPostId={post.id} />
          <BoardReportComments
            boardPostId={post.id}
            initial={reportComments}
            showLoginHint={userId === null}
          />
        </>
      ) : null}

      <div className="mt-8 border-t border-white/10 pt-4">
        <Link
          href={`/boards?tab=${listTab}`}
          className="text-xs font-semibold text-amber-200/90 hover:text-amber-100"
        >
          ← 목록으로
        </Link>
      </div>
    </article>
  );
}
