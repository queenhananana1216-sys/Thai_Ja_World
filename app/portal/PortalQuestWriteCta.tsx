'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const LABEL_FULL =
  '[첫 글 작성하고 도토리 500개 받기 미션 시작!]' as const;
const LABEL_BADGE = '🔥 첫 글 작성하고 500 도토리 받기' as const;

function hrefForCategory(cat: 'job' | 'flea' | 'free'): string {
  if (cat === 'job') return '/community/boards/new?cat=job';
  if (cat === 'flea') return '/community/boards/new?cat=flea';
  return '/boards/new';
}

const FUNNEL_MSG = '로그인 후 이용할 수 있는 기능입니다.' as const;

export default function PortalQuestWriteCta({
  category,
  className,
  variant = 'default',
  isLoggedIn,
}: {
  category: 'job' | 'flea' | 'free';
  className?: string;
  variant?: 'default' | 'badge';
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const href = hrefForCategory(category);

  function gateWrite(): boolean {
    if (isLoggedIn) return true;
    toast.error(FUNNEL_MSG, { position: 'top-center' });
    router.push('/login');
    return false;
  }

  async function activateQuest(): Promise<void> {
    try {
      await fetch('/api/quests/onboarding-first-post', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      /* 네트워크 실패해도 글쓰기 이동은 진행 */
    }
  }

  if (variant === 'badge') {
    return (
      <button
        type="button"
        className={`inline-flex max-w-full min-h-11 shrink-0 items-center gap-0.5 rounded-full border border-amber-400/45 bg-gradient-to-r from-amber-500/25 to-amber-600/15 px-3 py-1.5 text-left text-sm font-extrabold leading-snug text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:border-amber-300/60 hover:text-white ${className ?? ''}`}
        onClick={async () => {
          if (!gateWrite()) return;
          await activateQuest();
          router.push(href);
        }}
      >
        {LABEL_BADGE}
      </button>
    );
  }

  return (
    <div className={className ?? ''}>
      <button
        type="button"
        className="min-h-11 w-full rounded-lg border border-amber-400/35 bg-gradient-to-br from-amber-500/20 to-amber-700/10 px-3 py-2 text-center text-base font-extrabold leading-snug text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:border-amber-300/55 hover:text-white"
        onClick={async () => {
          if (!gateWrite()) return;
          await activateQuest();
          router.push(href);
        }}
      >
        {LABEL_FULL}
      </button>
      <p className="mt-1.5 px-0.5 text-center text-sm text-gray-200">
        로그인 시 미션이 자동으로 활성화됩니다.{' '}
        {isLoggedIn ? (
          <Link prefetch={true} href={href} className="text-gray-100 underline hover:text-amber-200">
            바로 이동
          </Link>
        ) : (
          <button
            type="button"
            className="text-gray-100 underline hover:text-amber-200"
            onClick={() => {
              toast.error(FUNNEL_MSG, { position: 'top-center' });
              router.push('/login');
            }}
          >
            바로 이동
          </button>
        )}
      </p>
    </div>
  );
}
