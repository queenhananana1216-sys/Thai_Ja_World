'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BoardPostList } from './BoardPostList';

export function BoardsHome() {
  const sp = useSearchParams();
  const tab = sp.get('tab') === 'info' ? 'info' : 'free';

  const tabClass = (active: boolean) =>
    active
      ? 'border-amber-400/50 bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white';

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
      {/* 좌측: 탭 (데스크톱 세로) */}
      <nav
        className="flex shrink-0 gap-2 lg:w-48 lg:flex-col lg:gap-2"
        aria-label="게시판 구분"
      >
        <Link
          href="/boards?tab=free"
          className={`rounded-xl border px-3 py-2.5 text-center text-xs font-bold backdrop-blur-md transition lg:text-left ${tabClass(tab === 'free')}`}
        >
          자유 게시판
          <span className="mt-0.5 block text-[10px] font-normal text-slate-500 lg:inline lg:ml-2">
            텍스트·이미지
          </span>
        </Link>
        <Link
          href="/boards?tab=info"
          className={`rounded-xl border px-3 py-2.5 text-center text-xs font-bold backdrop-blur-md transition lg:text-left ${tabClass(tab === 'info')}`}
        >
          정보 공유
          <span className="mt-0.5 block text-[10px] font-normal text-slate-500 lg:inline lg:ml-2">
            지도·위치
          </span>
        </Link>
      </nav>

      <section className="min-w-0 flex-1 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-50">
              {tab === 'info' ? '정보 공유 게시판' : '자유 게시판'}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {tab === 'info'
                ? '장소 기반 팁·업체 정보를 지도와 함께 남깁니다.'
                : '짧고 빠르게 — 고밀도 카드 그리드로 모입니다.'}
            </p>
          </div>
          <Link
            href={tab === 'info' ? '/boards/new?board_type=info' : '/boards/new?board_type=free'}
            className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-50 backdrop-blur-md hover:bg-emerald-500/25"
          >
            ✎ 글쓰기
          </Link>
        </header>

        <BoardPostList tab={tab} />
      </section>
    </div>
  );
}
