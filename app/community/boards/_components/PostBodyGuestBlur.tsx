'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const CTA_LABEL = '🔒 태국 숨은 꿀팁/제보 마저 보기 (3초 회원가입)' as const;

type Props = {
  /** false 이면 전체 본문만 표시 */
  gateActive: boolean;
  /** 게이트 ON: 서버에서 자른 티저만 전달 / OFF: 전체 본문 */
  bodyText: string;
  /** 로그인 후 돌아올 경로 */
  loginNextPath: string;
};

export default function PostBodyGuestBlur({ gateActive, bodyText, loginNextPath }: Props) {
  const [authOpen, setAuthOpen] = useState(false);
  const safeNext = loginNextPath.startsWith('/') ? loginNextPath : '/community/boards';

  if (!gateActive) {
    return (
      <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-200">{bodyText}</div>
    );
  }

  return (
    <>
      <div className="relative mt-4">
        <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-200">{bodyText}</div>

        <div className="relative mt-1 min-h-[200px] sm:min-h-[240px]">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent backdrop-blur-sm"
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center justify-center px-3 py-8">
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="pointer-events-auto max-w-full rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-500/90 via-orange-600/95 to-rose-700/90 px-5 py-4 text-center text-sm font-black leading-snug text-white shadow-[0_12px_40px_rgba(251,146,60,0.35)] ring-2 ring-white/20 transition hover:scale-[1.02] hover:brightness-110 active:scale-[0.99] sm:px-8 sm:text-base"
            >
              {CTA_LABEL}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="border-white/15 bg-slate-950 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">회원가입하고 전체 보기</DialogTitle>
            <DialogDescription className="text-slate-400">
              무료 가입 후 이 글의 나머지 본문·이미지·댓글 참여까지 바로 이용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              asChild
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-white hover:from-amber-400 hover:to-orange-500"
            >
              <Link href={`/auth/signup?next=${encodeURIComponent(safeNext)}`} prefetch={false}>
                ⚡ 3초 회원가입
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-white/20 bg-transparent text-slate-100 hover:bg-white/10">
              <Link href={`/login?next=${encodeURIComponent(safeNext)}`} prefetch={false}>
                이미 계정이 있어요 (로그인)
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
