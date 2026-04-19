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
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const availableScenes = useMemo(
    () => sceneUrls.filter((value) => typeof value === 'string' && value.trim().length > 0),
    [sceneUrls]
  );
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const hasScenes = availableScenes.length > 0;
  const activeSceneUrl = hasScenes ? availableScenes[activeSceneIndex % availableScenes.length] : undefined;

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
    const params = new URLSearchParams(window.location.search);
    const forceHighFromQuery = params.get('quality') === 'high' || params.get('spline') === 'on';
    const savedOverride = window.localStorage.getItem('tj_quality_override') === 'high';

    if (forceHighFromQuery) {
      window.localStorage.setItem('tj_quality_override', 'high');
      setQualityTier('high');
      return;
    }
    if (savedOverride) {
      setQualityTier('high');
      return;
    }

    // Desktop keeps rich visuals by default.
    if (!isMobile) {
      setQualityTier('high');
      return;
    }

    if (saveData || reducedMotion) {
      setQualityTier('low');
      return;
    }
    if (memory <= 1 || cores <= 2) {
      setQualityTier('low');
      return;
    }
    if (memory <= 2 || cores <= 4) {
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

  useEffect(() => {
    const updateLayout = () => setIsMobileLayout(window.innerWidth < 1024);
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

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

  const sectionStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.18)',
    background: '#090a1c',
    color: '#f8fafc',
    boxShadow: '0 30px 100px rgba(5,8,22,0.6)',
  };

  const contentWrapStyle: CSSProperties = {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    gap: 28,
    flexDirection: isMobileLayout ? 'column' : 'row',
    justifyContent: 'space-between',
    minHeight: isMobileLayout ? 420 : 520,
    padding: isMobileLayout ? '28px 18px' : '48px 36px',
  };

  const leftColStyle: CSSProperties = {
    flex: isMobileLayout ? '1 1 auto' : '1 1 58%',
    maxWidth: isMobileLayout ? '100%' : 760,
  };

  const rightColStyle: CSSProperties = {
    flex: isMobileLayout ? '1 1 auto' : '1 1 38%',
    maxWidth: isMobileLayout ? '100%' : 420,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  };

  const titleStyle: CSSProperties = {
    marginTop: 14,
    marginBottom: 0,
    fontSize: isMobileLayout ? 52 : 60,
    lineHeight: 1.1,
    fontWeight: 800,
    color: '#f8fafc',
    letterSpacing: '-0.02em',
    textShadow: '0 8px 24px rgba(1,4,18,0.55)',
  };

  const bodyTextStyle: CSSProperties = {
    marginTop: 18,
    marginBottom: 0,
    fontSize: isMobileLayout ? 16 : 20,
    lineHeight: 1.55,
    color: '#e2e8f0',
    textShadow: '0 3px 16px rgba(5,8,22,0.4)',
  };

  const ctaRowStyle: CSSProperties = {
    marginTop: 24,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  };

  const panelStyle: CSSProperties = {
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(13,15,36,0.6)',
    padding: isMobileLayout ? '14px' : '16px',
    backdropFilter: 'blur(10px)',
  };

  return (
    <section style={sectionStyle}>
      <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: -20 }}>
        <SplineHeroCanvas sceneUrl={activeSceneUrl} />
      </div>
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          zIndex: -10,
          background:
            'linear-gradient(115deg, rgba(9,10,28,0.88) 0%, rgba(16,14,36,0.72) 48%, rgba(38,17,54,0.52) 100%)',
        }}
        aria-hidden
      />
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          right: -80,
          top: -80,
          zIndex: -10,
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'rgba(167,139,250,0.24)',
          filter: 'blur(64px)',
        }}
        aria-hidden
      />
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          left: 40,
          bottom: -100,
          zIndex: -10,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'rgba(244,114,182,0.2)',
          filter: 'blur(72px)',
        }}
        aria-hidden
      />

      <div style={contentWrapStyle}>
        <div style={leftColStyle}>
          <p
            style={{
              display: 'inline-flex',
              margin: 0,
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid rgba(196,181,253,0.45)',
              background: 'rgba(139,92,246,0.14)',
              color: '#e9d5ff',
              fontSize: isMobileLayout ? 12 : 13,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            오늘의 한줄 기사 · 생활정보 · 태국 꿀팁
          </p>
          <h1 style={titleStyle}>
            오늘 태국 한줄 기사부터 바로 확인하세요
          </h1>
          <p style={bodyTextStyle}>
            비자·병원·집·교통, 오늘 필요한 정보를 한줄로 먼저 보고 필요한 메뉴로 바로 이동하세요.
          </p>

          <div style={ctaRowStyle}>
            <Link
              href="/tips"
              style={heroPrimaryCtaStyle}
            >
              오늘의 생활꿀팁 보기
            </Link>
            <Link
              href="/community/boards?cat=info"
              style={heroSecondaryCtaStyle}
            >
              주요 기사 확인하기
            </Link>
          </div>

          <p style={{ ...bodyTextStyle, marginTop: 24, fontSize: isMobileLayout ? 14 : 15 }}>
            한줄 기사 확인 후 번개장터·구인구직·로컬 메뉴로 바로 연결됩니다.
          </p>
          {!hasScenes ? (
            <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(221,214,254,0.9)' }}>
              3D 배경 적용: `.env.local`에 `NEXT_PUBLIC_SPLINE_HERO_SCENE_URL` 값을 넣어주세요.
            </p>
          ) : null}
        </div>

        <div style={rightColStyle}>
          <div style={panelStyle}>
            <p style={{ margin: 0, color: '#ddd6fe', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
              정보 확인 후 바로 이동
            </p>
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              <Link
                href="/community/trade"
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
                style={heroPanelCtaStyle}
              >
                날씨·로컬 정보 보기
              </Link>
            </div>
          </div>
          <div style={{ ...panelStyle, padding: '8px 12px', fontSize: 12, color: '#ddd6fe' }}>
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
