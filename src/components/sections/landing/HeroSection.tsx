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
    const isMobile = window.innerWidth < 768;

    // Desktop keeps rich visuals by default.
    if (!isMobile) {
      setQualityTier('high');
      return;
    }

    if (saveData || reducedMotion || memory <= 2 || cores <= 2) {
      setQualityTier('low');
      return;
    }
    if (memory <= 4 || cores <= 4) {
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
    background: 'linear-gradient(120deg,#c4b5fd,#f9a8d4)',
    color: '#111827',
    boxShadow: '0 12px 38px rgba(196,181,253,0.42)',
  };

  const heroSecondaryCtaStyle: CSSProperties = {
    ...heroPrimaryCtaStyle,
    fontWeight: 600,
    background: 'rgba(255,255,255,0.12)',
    color: '#f8fafc',
    border: '1px solid rgba(255,255,255,0.24)',
    boxShadow: 'none',
  };

  const heroPanelCtaStyle: CSSProperties = {
    ...heroSecondaryCtaStyle,
    justifyContent: 'flex-start',
    width: '100%',
  };

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-white/15 bg-[#090a1c] text-white shadow-[0_30px_100px_rgba(5,8,22,0.6)] sm:rounded-4xl">
      <div className="pointer-events-none absolute inset-0 -z-20">
        <SplineHeroCanvas sceneUrl={activeSceneUrl} />
      </div>
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(115deg, rgba(7,9,26,0.9) 18%, rgba(20,16,44,0.72) 55%, rgba(38,17,54,0.55) 100%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-20 -z-10 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-10 -z-10 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto grid min-h-[500px] max-w-6xl gap-7 px-4 py-8 sm:px-8 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="z-10">
          <p className="inline-flex rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-violet-100 sm:text-xs sm:uppercase sm:tracking-[0.18em]">
            오늘의 한줄 기사 · 생활정보 · 태국 꿀팁
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
            오늘 태국 한줄 기사부터 바로 확인하세요
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200 sm:mt-6 sm:text-lg">
            비자·병원·집·교통, 오늘 필요한 정보를 한줄로 먼저 보고 필요한 메뉴로 바로 이동하세요.
          </p>

          <div
            className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
          >
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

        <div className="z-10 space-y-4">
          <div className="rounded-3xl border border-white/15 bg-[rgba(13,15,36,0.58)] p-4 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-100">정보 확인 후 바로 이동</p>
            <div className="mt-3 grid gap-2">
              <Link
                href="/community/trade"
                className="inline-flex min-h-11 items-center rounded-xl border border-violet-300/35 bg-violet-400/10 px-3 py-2.5 text-sm font-semibold text-violet-50 no-underline transition hover:bg-violet-400/20"
                style={{
                  ...heroPanelCtaStyle,
                  background: 'rgba(139,92,246,0.2)',
                  border: '1px solid rgba(196,181,253,0.45)',
                }}
              >
                번개장터 가기
              </Link>
              <Link
                href="/community/boards?cat=job"
                className="inline-flex min-h-11 items-center rounded-xl border border-amber-200/30 bg-amber-300/10 px-3 py-2.5 text-sm font-semibold text-amber-100 no-underline transition hover:bg-amber-300/20"
                style={{
                  ...heroPanelCtaStyle,
                  background: 'rgba(251,191,36,0.14)',
                  border: '1px solid rgba(253,230,138,0.35)',
                  color: '#fef3c7',
                }}
              >
                구인구직 보기
              </Link>
              <Link
                href="/local"
                className="inline-flex min-h-11 items-center rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm font-semibold text-slate-100 no-underline transition hover:bg-white/10"
                style={heroPanelCtaStyle}
              >
                날씨·로컬 정보 보기
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[rgba(8,9,24,0.5)] px-3 py-2 text-[11px] text-violet-100/90">
            {qualityTier === 'low'
              ? '저사양 최적화 모드'
              : hasScenes
                ? `브랜드 3D 배경 활성화 · ${activeSceneIndex + 1}/${availableScenes.length}`
                : '브랜드 3D 배경 준비 중'}
          </div>
        </div>
      </div>
    </section>
  );
}
