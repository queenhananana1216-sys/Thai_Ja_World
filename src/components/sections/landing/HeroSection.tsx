'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SplineHeroCanvas } from '@/components/3d/SplineHeroCanvas';

interface HeroSectionProps {
  memberCount?: number;
  sceneUrls?: string[];
}

export function HeroSection({ memberCount = 0, sceneUrls = [] }: HeroSectionProps) {
  const availableScenes = useMemo(
    () => sceneUrls.filter((value) => typeof value === 'string' && value.trim().length > 0),
    [sceneUrls]
  );
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const hasScenes = availableScenes.length > 0;
  const activeSceneUrl = hasScenes ? availableScenes[activeSceneIndex % availableScenes.length] : undefined;

  useEffect(() => {
    if (availableScenes.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveSceneIndex((prev) => (prev + 1) % availableScenes.length);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [availableScenes.length]);

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-white/15 bg-[linear-gradient(120deg,rgba(9,10,28,0.9),rgba(33,17,52,0.78))] px-4 py-8 text-white shadow-[0_30px_100px_rgba(5,8,22,0.6)] backdrop-blur-xl sm:rounded-4xl sm:px-8 sm:py-12">
      <div
        className="pointer-events-none absolute -right-20 -top-20 -z-10 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-10 -z-10 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="inline-flex rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-violet-100">
            태자월드 커뮤니티
          </p>
          <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-5xl">
            태국 생활 정보, 아직도 채팅방에서만 찾고 계신가요?
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
            태국에 사는 한국인 <strong className="text-amber-300">{memberCount.toLocaleString('ko-KR')}명</strong>이 비자,
            병원, 집, 생활 정보를 직접 올리고 검증하는 곳. 흘러가는 채팅방이 아닌, 쌓이고 검색되는 커뮤니티입니다.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/community/trade"
              className="rounded-xl bg-[linear-gradient(120deg,#c4b5fd,#f9a8d4)] px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_12px_38px_rgba(196,181,253,0.42)] transition hover:scale-[1.02] hover:brightness-110 sm:px-6 sm:py-3 sm:text-base"
            >
              오늘 올라온 번개장터 보러가기
            </Link>
            <Link
              href="/community/boards"
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm text-slate-200 no-underline transition hover:bg-white/10"
            >
              구인구직 · 생활질문 최신글 확인
            </Link>
          </div>

          <p className="mt-8 text-sm text-slate-300">
            방콕 · 파타야 · 치앙마이 실사용 후기 · 번개장터 · 구인구직 · 당일 예약 배송 가능한 로컬 가게
          </p>
          {!hasScenes ? (
            <p className="mt-3 text-xs text-violet-200/80">
              3D 배경 적용: `.env.local`에 `NEXT_PUBLIC_SPLINE_HERO_SCENE_URL` 값을 넣어주세요.
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-100">지금 바로 참여하기</p>
            <div className="mt-3 grid gap-2">
              <Link
                href="/community/trade"
                className="rounded-xl border border-violet-300/35 bg-violet-400/10 px-3 py-2.5 text-sm font-semibold text-violet-50 no-underline transition hover:bg-violet-400/20"
              >
                번개장터에서 바로 거래 시작
              </Link>
              <Link
                href="/local"
                className="rounded-xl border border-amber-200/30 bg-amber-300/10 px-3 py-2.5 text-sm font-semibold text-amber-100 no-underline transition hover:bg-amber-300/20"
              >
                당일 예약·배송 가능한 가게 찾기
              </Link>
              <Link
                href="/community/boards"
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm font-semibold text-slate-100 no-underline transition hover:bg-white/10"
              >
                구인구직·생활질문 글 바로 보기
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-100">
              <span>브랜드 배경 미리보기</span>
              <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-2 py-0.5 text-[10px]">
                {hasScenes ? `${activeSceneIndex + 1} / ${availableScenes.length}` : '배경 준비 중'}
              </span>
            </div>
            <div className="h-[130px] overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-[0_14px_35px_rgba(15,23,42,0.45)] sm:h-[220px]">
              <SplineHeroCanvas sceneUrl={activeSceneUrl} />
            </div>
            {availableScenes.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                {availableScenes.map((_, idx) => (
                  <button
                    key={`scene-${idx}`}
                    type="button"
                    onClick={() => setActiveSceneIndex(idx)}
                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition sm:px-2.5 sm:text-[11px] ${
                      idx === activeSceneIndex
                        ? 'border-violet-200 bg-violet-200/20 text-violet-50'
                        : 'border-white/25 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    배경 {idx + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
