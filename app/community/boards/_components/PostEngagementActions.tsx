'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { absoluteUrl } from '@/lib/seo/site';

const FUNNEL_MSG = '로그인 후 이용할 수 있는 기능입니다.' as const;

export default function PostEngagementActions({
  postPath,
  isLoggedIn,
}: {
  postPath: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const onCommentClick = useCallback(() => {
    if (!isLoggedIn) {
      toast.error(FUNNEL_MSG, { position: 'top-center' });
      router.push('/login');
      return;
    }
    const target = document.getElementById('post-comments');
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const textarea = document.getElementById('cbody') as HTMLTextAreaElement | null;
    textarea?.focus();
  }, [isLoggedIn, router]);

  const onReactionClick = useCallback(() => {
    const target = document.getElementById('post-reactions');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const onShareClick = useCallback(async () => {
    const url = absoluteUrl(postPath);
    const title = document.title;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User can cancel native share dialog; silently fall back.
      }
    }
    await navigator.clipboard.writeText(url);
    window.alert('링크를 복사했어요.');
  }, [postPath]);

  const baseClass =
    'inline-flex items-center rounded-full border border-white/15 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-800/85';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={baseClass} onClick={onReactionClick}>
        👍 공감하기
      </button>
      <button type="button" className={baseClass} onClick={onCommentClick}>
        💬 댓글 쓰기
      </button>
      <button type="button" className={baseClass} onClick={() => void onShareClick()}>
        🔗 공유하기
      </button>
    </div>
  );
}
