'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BoardPostList } from './BoardPostList';

export function BoardsHome() {
  const sp = useSearchParams();
  const tabRaw = sp.get('tab');
  const tab =
    tabRaw === 'info'
      ? 'info'
      : tabRaw === 'reports'
        ? 'reports'
        : tabRaw === 'tips'
          ? 'tips'
          : 'free';

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
        <Link
          href="/boards?tab=tips"
          className={`rounded-xl border px-3 py-2.5 text-center text-xs font-bold backdrop-blur-md transition lg:text-left ${tabClass(tab === 'tips')}`}
        >
          생활·여행 팁
          <span className="mt-0.5 block text-[10px] font-normal text-slate-500 lg:inline lg:ml-2">
            운영 큐레이션
          </span>
        </Link>
        <Link
          href="/boards?tab=reports"
          className={`rounded-xl border px-3 py-2.5 text-center text-xs font-bold backdrop-blur-md transition lg:text-left ${tabClass(tab === 'reports')}`}
        >
          검증 제보
          <span className="mt-0.5 block text-[10px] font-normal text-slate-500 lg:inline lg:ml-2">
            운영 확인 글
          </span>
        </Link>
      </nav>

      <section className="min-w-0 flex-1 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-50">
              {tab === 'info'
                ? '정보 공유 게시판'
                : tab === 'reports'
                  ? '검증 제보 게시판'
                  : tab === 'tips'
                    ? '생활·여행 팁 (큐레이션)'
                    : '자유 게시판'}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {tab === 'info'
                ? '장소 기반 팁·업체 정보를 지도와 함께 남깁니다.'
                : tab === 'reports'
                  ? '운영진이 검증·정리한 제보만 게시됩니다. 댓글과 공감은 누구나 남길 수 있습니다.'
                  : tab === 'tips'
                    ? '교민·관광객에게 유용한 주제를 운영 파이프라인이 주기적으로 카드로 정리합니다.'
                    : '짧고 빠르게 — 고밀도 카드 그리드로 모입니다.'}
            </p>
          </div>
          {tab === 'reports' ? (
            <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-[11px] font-bold text-rose-100/90">
              글 작성은 관리자만
            </span>
          ) : tab === 'tips' ? (
            <span className="rounded-full border border-teal-400/25 bg-teal-500/10 px-4 py-2 text-[11px] font-bold text-teal-100/90">
              자동 발행 전용
            </span>
          ) : (
            <Link
              href={tab === 'info' ? '/boards/new?board_type=info' : '/boards/new?board_type=free'}
              className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-50 backdrop-blur-md hover:bg-emerald-500/25"
            >
              ✎ 글쓰기
            </Link>
          )}
        </header>

        <BoardPostList tab={tab} />
      </section>
    </div>
  );
}
