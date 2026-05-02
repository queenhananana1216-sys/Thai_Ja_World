'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import BoardReportComments, { type BoardReportCommentRow } from './BoardReportComments';
import BoardReportReactionsPanel from './BoardReportReactionsPanel';
import { MiniMapView } from './MiniMapView';
import type { BoardPostRow } from './types';

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
      post.board_type === 'info' ? 'info' : post.board_type === 'reports' ? 'reports' : 'free'
    }`;
  }

  const listTab = isReports ? 'reports' : post.board_type === 'info' ? 'info' : 'free';

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

      <div className="mb-2 inline-flex items-center gap-2">
        <span
          className={
            post.board_type === 'info'
              ? 'rounded-full border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-100'
              : isReports
                ? 'rounded-full border border-rose-400/35 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-100'
                : 'rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-100'
          }
        >
          {post.board_type === 'info'
            ? '정보 공유'
            : isReports
              ? '검증 제보'
              : '자유 게시판'}
        </span>
        <time className="text-[10px] text-slate-500" dateTime={post.created_at}>
          {new Date(post.created_at).toLocaleString('ko-KR')}
        </time>
      </div>

      <h1 className="text-xl font-black tracking-tight text-slate-50 sm:text-2xl">{post.title}</h1>

      <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-200/95 [text-wrap:pretty]">
        {post.content}
      </div>

      {imgs.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            이미지
          </p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
            {imgs.map((src) => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-slate-950 shadow-inner"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
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
