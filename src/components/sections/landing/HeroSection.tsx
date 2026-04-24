'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { SplineCanvas } from '@/components/3d/SplineCanvas';
import { SplineHeroCanvas } from '@/components/3d/SplineHeroCanvas';
import { getDictionary } from '@/i18n/dictionaries';
import { readLocaleCookie } from '@/i18n/readLocaleCookie';
import { TJ_LOCALE_CHANGE_EVENT, type Locale } from '@/i18n/types';
import type { SplineSceneRecord } from '@/lib/spline/types';
import type { OpenMeteoCityPayload } from '@/lib/weather/openMeteoThailand';

export interface HeroPipeData {
  weather: {
    /** SSR에서 채움. 비어 있거나 오류면 degraded. */
    cities: OpenMeteoCityPayload[];
    /** ISO 시간 또는 null(실패) */
    updatedAt: string | null;
    degraded: boolean;
  };
  localPublicSpotCount: number;
}

interface HeroSectionProps {
  memberCount?: number;
  /** 레거시: 랜덤 로테이션용 scene URL 배열 */
  sceneUrls?: string[];
  /** 신규: spline_scenes 파이프라인의 `hero` 슬롯 레코드 (우선 적용) */
  heroScene?: SplineSceneRecord;
  /** 랜딩 SSR: 날씨(방콕) + 공개 로컬 가게 수 */
  pipe?: HeroPipeData;
}

/** 카피가 비었을 때의 i18n 기본값(빈 페이지 방지) */
const HARDCODED_KICKER_FALLBACK = '오늘의 한줄 기사 · 생활정보 · 태국 꿀팁';
const HARDCODED_TITLE_FALLBACK = '오늘 태국 한줄 기사부터 바로 확인하세요';
const HARDCODED_BODY_FALLBACK =
  '비자·병원·집·교통, 오늘 필요한 정보를 한줄로 먼저 보고 필요한 메뉴로 바로 이동하세요.';

export function HeroSection({
  memberCount: _memberCount = 0,
  sceneUrls = [],
  heroScene,
  pipe,
}: HeroSectionProps) {
  const [locale, setLocale] = useState<Locale>('ko');

  useLayoutEffect(() => {
    setLocale(readLocaleCookie());
  }, []);

  useEffect(() => {
    function onLocaleChange(e: Event) {
      const ce = e as CustomEvent<Locale>;
      if (ce.detail === 'ko' || ce.detail === 'th') setLocale(ce.detail);
    }
    window.addEventListener(TJ_LOCALE_CHANGE_EVENT, onLocaleChange);
    return () => window.removeEventListener(TJ_LOCALE_CHANGE_EVENT, onLocaleChange);
  }, []);

  const d = useMemo(() => getDictionary(locale), [locale]);
  const h = d.home;
  const hAny = h as typeof h & Record<string, string>;
  // 어느 하나라도 실제 텍스트가 비면 하드코딩 폴백을 써서 히어로가 "비어 보이는" 일을 막는다.
  const copyKicker = (h.heroKicker?.trim() || HARDCODED_KICKER_FALLBACK);
  const copyLead = (h.heroLead?.trim() || HARDCODED_TITLE_FALLBACK);
  const copyBody = (h.heroSub?.trim().replace(/\\n/g, ' ') || HARDCODED_BODY_FALLBACK);
  const copyPrimaryCta = (hAny.heroPrimaryCta?.trim() || h.tipDigestTitle || '오늘의 생활꿀팁 보기');
  const copySecondaryCta = (hAny.heroSecondaryCta?.trim() || h.newsTitle || '주요 기사 확인하기');
  const copyBridgeHint =
    hAny.heroBridgeHint?.trim() || '한줄 기사 확인 후 번개장터·구인구직·로컬 메뉴로 바로 연결됩니다.';
  const copyPanelTitle = hAny.heroPanelTitle?.trim() || '정보 확인 후 바로 이동';
  const copyPanelTrade = hAny.heroPanelTrade?.trim() || '번개장터 가기';
  const copyPanelJob = hAny.heroPanelJob?.trim() || '구인구직 보기';
  const copyPanelLocal = hAny.heroPanelLocal?.trim() || '날씨·로컬 정보 보기';
  const weatherLine = useMemo(() => {
    if (!pipe?.weather) return null;
    if (pipe.weather.degraded || pipe.weather.cities.length === 0) {
      return h.heroPipeWeatherFallback;
    }
    const first = pipe.weather.cities[0];
    if (!first) return h.heroPipeWeatherFallback;
    const label =
      first.key === 'pattaya'
        ? h.weatherPattaya
        : first.key === 'chiang_mai'
          ? h.weatherChiangMai
          : h.weatherBangkok;
    const t =
      first.temperature_c !== null && first.temperature_c !== undefined
        ? `${first.temperature_c}°C`
        : '—';
    return `${label} ${t} · ${first.condition}`;
  }, [pipe, h]);

  const localShopsLine = useMemo(() => {
    if (!pipe) return null;
    return h.heroPipeLocalShops.replace('{n}', String(Math.max(0, pipe.localPublicSpotCount)));
  }, [pipe, h]);

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
        {heroScene && (heroScene.sceneCodeUrl || heroScene.publishedUrl) ? (
          <SplineCanvas
            slot="hero"
            publishedUrl={heroScene.publishedUrl}
            sceneCodeUrl={heroScene.sceneCodeUrl}
            quality={qualityTier === 'low' ? 'low' : heroScene.qualityTier}
            title="Thai Ja World Hero 3D"
          />
        ) : (
          <SplineHeroCanvas sceneUrl={activeSceneUrl} />
        )}
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
            {copyKicker}
          </p>
          <h1 style={titleStyle}>
            {copyLead}
          </h1>
          <p style={bodyTextStyle}>
            {copyBody}
          </p>

          <div style={ctaRowStyle}>
            <Link
              href="/tips"
              style={heroPrimaryCtaStyle}
            >
              {copyPrimaryCta}
            </Link>
            <Link
              href="/community/boards?cat=info"
              style={heroSecondaryCtaStyle}
            >
              {copySecondaryCta}
            </Link>
          </div>

          <p style={{ ...bodyTextStyle, marginTop: 24, fontSize: isMobileLayout ? 14 : 15 }}>
            {copyBridgeHint}
          </p>
          {/* 3D 장면 적용 안내(하드코딩된 기술 문구) 는 운영자 공간으로 이동 — 일반 사용자에겐 노출 금지 */}
        </div>

        <div style={rightColStyle}>
          <div style={panelStyle}>
            <p style={{ margin: 0, color: '#ddd6fe', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
              {copyPanelTitle}
            </p>
            {pipe && (weatherLine || localShopsLine) ? (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 10px',
                  borderRadius: 12,
                  background: 'rgba(15,16,32,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {weatherLine ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.4,
                      color: '#e2e8f0',
                      fontWeight: 600,
                    }}
                  >
                    {weatherLine}
                  </p>
                ) : null}
                {localShopsLine ? (
                  <p
                    style={{
                      margin: weatherLine ? '4px 0 0' : 0,
                      fontSize: 12,
                      lineHeight: 1.4,
                      color: '#cbd5e1',
                    }}
                  >
                    {localShopsLine}
                  </p>
                ) : null}
                {!pipe.weather.degraded && pipe.weather.updatedAt && (
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 9,
                      color: 'rgba(148,163,184,0.9)',
                    }}
                  >
                    {h.weatherAttribution}
                  </p>
                )}
              </div>
            ) : null}
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              <Link
                href="/community/trade"
                style={{
                  ...heroPanelCtaStyle,
                  background: 'rgba(139,92,246,0.2)',
                  border: '1px solid rgba(196,181,253,0.45)',
                }}
              >
                {copyPanelTrade}
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
                {copyPanelJob}
              </Link>
              <Link
                href="/local"
                style={heroPanelCtaStyle}
              >
                {copyPanelLocal}
              </Link>
            </div>
          </div>
          {/* 디버그성 3D 상태 라벨은 일반 사용자에 노출하지 않음 (히어로 카드가 비어보이지 않게 상단 패널이 이미 내용 채움) */}
        </div>
      </div>
    </section>
  );
}
