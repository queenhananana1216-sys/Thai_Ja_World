import type { ReactNode } from 'react';
import Link from 'next/link';
import { PortalShell } from '@/components/banners/PortalShell';
import { BoardsToaster } from './BoardsToaster';

export default async function BoardsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="pb-10 pt-1">
        <PortalShell routeGroup="boards" mainMaxWidth={960}>
          <aside
            className="mb-4 rounded-2xl border border-white/15 bg-slate-950/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
            style={{
              background:
                'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,27,75,0.35))',
            }}
          >
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/90">
              커뮤니티 · 게시판
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                prefetch={true}
                href="/boards?tab=free"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 no-underline backdrop-blur-md hover:border-amber-400/40 hover:text-amber-100"
              >
                자유 게시판
              </Link>
              <Link
                prefetch={true}
                href="/boards?tab=info"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 no-underline backdrop-blur-md hover:border-sky-400/40 hover:text-sky-100"
              >
                정보 공유
              </Link>
              <Link
                prefetch={true}
                href="/boards?tab=reports"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 no-underline backdrop-blur-md hover:border-rose-400/40 hover:text-rose-100"
              >
                검증 제보
              </Link>
              <Link
                prefetch={true}
                href="/boards/new?board_type=free"
                className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-100 no-underline hover:bg-emerald-500/25"
              >
                ✎ 자유 글쓰기
              </Link>
              <Link
                prefetch={true}
                href="/boards/new?board_type=info"
                className="rounded-full border border-sky-400/25 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-100 no-underline hover:bg-sky-500/25"
              >
                📍 정보 글쓰기
              </Link>
            </div>
          </aside>
          {children}
        </PortalShell>
      </div>
      <BoardsToaster />
    </>
  );
}
