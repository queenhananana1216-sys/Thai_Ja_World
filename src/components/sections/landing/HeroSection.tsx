'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { SplineHeroCanvas } from '@/components/3d/SplineHeroCanvas';

interface HeroSectionProps {
  memberCount?: number;
  sceneUrls?: string[];
}

export function HeroSection({ memberCount: _memberCount = 0, sceneUrls = [] }: HeroSectionProps) {
  const [qualityTier, setQualityTier] = useState<'low' | 'medium' | 'high'>('high');
  const availableScenes = useMemo(
    () => sceneUrls.filter((value) => typeof value === 'string' && value.trim().length > 0),
    [sceneUrls]
  );
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const hasScenes = availableScenes.length > 0;
  const activeSceneUrl =
    hasScenes && qualityTier !== 'low' ? availableScenes[activeSceneIndex % availableScenes.length] : undefined;

  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };

    const memory = nav.deviceMemory ?? 4;
    const cores = nav.hardwareConcurrency ?? 4;
    const saveData = Boolean(nav.connection?.saveData);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (saveData || reducedMotion || memory <= 2 || cores <= 4) {
      setQualityTier('low');
      return;
    }
    if (memory <= 4 || cores <= 6) {
      setQualityTier('medium');
      return;
    }
    setQualityTier('high');
  }, []);

  useEffect(() => {
    if (availableScenes.length <= 1) {
      return;
    }
    if (qualityTier === 'low') {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveSceneIndex((prev) => (prev + 1) % availableScenes.length);
    }, qualityTier === 'medium' ? 10000 : 8000);

    return () => window.clearInterval(interval);
  }, [availableScenes.length, qualityTier]);

  const heroPrimaryCtaStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: '12px 16px',
    borderRadius: 12,
    fontWeight: 700,
    textDecoration: 'none',
    textAlign: 'center',
  };

  const heroSecondaryCtaStyle: CSSProperties = {
    ...heroPrimaryCtaStyle,
    fontWeight: 600,
  };

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
          <p className="inline-flex rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-violet-100 sm:text-xs sm:uppercase sm:tracking-[0.18em]">
            오늘의 한줄 기사 · 생활정보 · 태국 꿀팁
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
            오늘 태국 한줄 기사부터 바로 확인하세요
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200 sm:mt-6 sm:text-lg">
            비자·병원·집·교통, 오늘 필요한 정보를 한줄로 먼저 보고 필요한 메뉴로 바로 이동하세요.
          </p>

          <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link
              href="/tips"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#c4b5fd,#f9a8d4)] px-5 py-3 text-center text-sm font-bold text-slate-950 no-underline shadow-[0_12px_38px_rgba(196,181,253,0.42)] transition hover:scale-[1.02] hover:brightness-110 sm:min-h-[52px] sm:px-6 sm:text-base"
              style={heroPrimaryCtaStyle}
            >
              오늘의 생활꿀팁 보기
            </Link>
            <Link
              href="/community/boards?cat=info"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-center text-sm font-semibold text-slate-100 no-underline transition hover:bg-white/15 sm:min-h-[52px] sm:text-base"
              style={heroSecondaryCtaStyle}
            >
              주요 기사 확인하기
            </Link>
          </div>

          <p className="mt-8 text-sm text-slate-300">
            한줄 기사 확인 후 번개장터·구인구직·로컬 메뉴로 바로 연결됩니다.
          </p>
          {!hasScenes ? (
            <p className="mt-3 text-xs text-violet-200/80">
              3D 배경 적용: `.env.local`에 `NEXT_PUBLIC_SPLINE_HERO_SCENE_URL` 값을 넣어주세요.
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-100">정보 확인 후 바로 이동</p>
            <div className="mt-3 grid gap-2">
              <Link
                href="/community/trade"
                className="inline-flex min-h-11 items-center rounded-xl border border-violet-300/35 bg-violet-400/10 px-3 py-2.5 text-sm font-semibold text-violet-50 no-underline transition hover:bg-violet-400/20"
                style={heroSecondaryCtaStyle}
              >
                번개장터 가기
              </Link>
              <Link
                href="/community/boards?cat=job"
                className="inline-flex min-h-11 items-center rounded-xl border border-amber-200/30 bg-amber-300/10 px-3 py-2.5 text-sm font-semibold text-amber-100 no-underline transition hover:bg-amber-300/20"
                style={heroSecondaryCtaStyle}
              >
                구인구직 보기
              </Link>
              <Link
                href="/local"
                className="inline-flex min-h-11 items-center rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm font-semibold text-slate-100 no-underline transition hover:bg-white/10"
                style={heroSecondaryCtaStyle}
              >
                날씨·로컬 정보 보기
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-100">
              <span>{qualityTier === 'low' ? '경량 배경 모드' : '브랜드 배경 미리보기'}</span>
              <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-2 py-0.5 text-[10px]">
                {qualityTier === 'low'
                  ? '저사양 최적화'
                  : hasScenes
                    ? `${activeSceneIndex + 1} / ${availableScenes.length}`
                    : '배경 준비 중'}
              </span>
            </div>
            <div className="h-[130px] overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-[0_14px_35px_rgba(15,23,42,0.45)] sm:h-[220px]">
              <SplineHeroCanvas sceneUrl={activeSceneUrl} />
            </div>
            {qualityTier !== 'low' && availableScenes.length > 1 ? (
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
