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

interface HeroSectionProps {
  memberCount?: number;
  /** 포털 히어로 우측: 집계 숫자(fetchLandingStatsSSR) */
  portalStats?: {
    memberCount: number;
    postCount: number;
    newsCount: number;
    spotCount: number;
    lastUpdatedAt: string | null;
    degraded?: boolean;
  };
  /** 레거시: 랜덤 로테이션용 scene URL 배열 */
  sceneUrls?: string[];
  /** 신규: spline_scenes 파이프라인의 `hero` 슬롯 레코드 (우선 적용) */
  heroScene?: SplineSceneRecord;
  /** 랜딩 포털: 다크 히어로 높이·3D 부하를 줄이고 아래 라이트 3열로 이어짐 */
  variant?: 'default' | 'portalCompact';
}

/** 카피가 비었을 때의 i18n 기본값(빈 페이지 방지) */
const HARDCODED_KICKER_FALLBACK = '오늘의 한줄 기사 · 생활정보 · 태국 꿀팁';
const HARDCODED_TITLE_FALLBACK = '오늘 태국 한줄 기사부터 바로 확인하세요';
const HARDCODED_BODY_FALLBACK =
  '비자·병원·집·교통, 오늘 필요한 정보를 한줄로 먼저 보고 필요한 메뉴로 바로 이동하세요.';

export function HeroSection({
  memberCount: _memberCount = 0,
  portalStats,
  sceneUrls = [],
  heroScene,
  variant = 'default',
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

    if (variant === 'portalCompact') {
      if (reducedMotion) {
        setQualityTier('low');
        return;
      }
      if (forceHighFromQuery) {
        window.localStorage.setItem('tj_quality_override', 'high');
        setQualityTier('high');
        return;
      }
      if (savedOverride) {
        setQualityTier('high');
        return;
      }
      setQualityTier('low');
      return;
    }

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
  }, [variant]);

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

  const isPortal = variant === 'portalCompact';

  if (isPortal) {
    const th = locale === 'th';
    const portalMinH = isMobileLayout ? 'min(32vh, 300px)' : 'min(36vh, 400px)';
    const compactSection: CSSProperties = {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.14)',
      background: '#090a1c',
      color: '#f8fafc',
      minHeight: portalMinH,
      maxHeight: '38vh',
      boxShadow: '0 20px 60px rgba(5,8,22,0.45)',
    };
    const compactWrap: CSSProperties = {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      flexDirection: isMobileLayout ? 'column' : 'row',
      gap: isMobileLayout ? 16 : 24,
      justifyContent: 'space-between',
      minHeight: 0,
      padding: isMobileLayout ? '18px 16px' : '22px 24px',
    };
    const quickLinks = [
      { href: '/community/boards?cat=flea', label: th ? 'ตลาด' : '번개' },
      { href: '/community/boards?cat=job', label: th ? 'งาน' : '구인' },
      { href: '/local', label: th ? 'ร้าน' : '로컬' },
      { href: '/minihome', label: th ? 'มินิ' : '미니홈' },
    ] as const;
    const s = portalStats;
    const statRows = s
      ? [
          { k: 'm', label: th ? 'สมาชิก' : '가입', v: s.memberCount, href: '/auth/signup' as const },
          { k: 'p', label: th ? 'โพสต์' : '게시', v: s.postCount, href: '/community/boards' as const },
          { k: 'n', label: th ? 'ข่าว' : '뉴스', v: s.newsCount, href: '/news' as const },
          { k: 'l', label: th ? 'ร้าน' : '로컬', v: s.spotCount, href: '/local' as const },
        ]
      : null;
    const lastLine = (() => {
      if (!s?.lastUpdatedAt) return th ? 'ข้อมูลสรุป — อัปเดตล่าสุด' : '집계·요약 — 최근 콘텐츠 갱신';
      try {
        const t = new Date(s.lastUpdatedAt);
        if (!Number.isFinite(t.getTime())) return '';
        return th
          ? `อัปเดต ${t.toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
          : `최신 갱신 ${t.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      } catch {
        return '';
      }
    })();
    return (
      <section className="tj-landing-hero-portal" style={compactSection} aria-label={th ? 'ภาพรวม' : '요약·바로가기'}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background:
              'linear-gradient(120deg, rgba(9,10,28,0.95) 0%, rgba(20,12,32,0.88) 55%, rgba(30,20,50,0.6) 100%)',
          }}
          aria-hidden
        />
        <div style={compactWrap}>
          <div style={{ flex: '1 1 55%', minWidth: 0 }}>
            <p
              style={{
                display: 'inline-flex',
                margin: 0,
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid rgba(196,181,253,0.4)',
                background: 'rgba(139,92,246,0.12)',
                color: '#e9d5ff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              {copyKicker}
            </p>
            <h1
              style={{
                margin: '8px 0 0',
                fontSize: isMobileLayout ? 22 : 26,
                lineHeight: 1.2,
                fontWeight: 800,
                color: '#f8fafc',
                letterSpacing: '-0.02em',
                textShadow: '0 4px 20px rgba(1,4,18,0.5)',
              }}
            >
              {copyLead}
            </h1>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: isMobileLayout ? 13 : 14,
                lineHeight: 1.5,
                color: '#cbd5e1',
              }}
            >
              {copyBody}
            </p>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Link href="/community/boards" style={{ ...heroPrimaryCtaStyle, minHeight: 40, padding: '10px 14px', fontSize: 14 }}>
                {th ? 'กระดาน' : '광장 둘러보기'}
              </Link>
              <Link href="/news" style={{ ...heroSecondaryCtaStyle, minHeight: 40, padding: '10px 14px', fontSize: 14 }}>
                {th ? 'ข่าว' : '뉴스'}
              </Link>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.45 }}>{copyBridgeHint}</p>
          </div>
          <div
            style={{
              flex: isMobileLayout ? '1 1 auto' : '0 0 min(260px, 32%)',
              minWidth: isMobileLayout ? undefined : 200,
            }}
          >
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#a5b4fc' }}>
              {th ? 'ตัวเลขสรุป' : '지금 쌓인 데이터'}
              {s?.degraded ? (
                <span style={{ fontWeight: 600, color: '#fbbf24' }}> {th ? '(อ้างอิง)' : '(참고·연결 점검)'}</span>
              ) : null}
            </p>
            {statRows ? (
              <div
                style={{
                  marginTop: 8,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 6,
                }}
              >
                {statRows.map((row) => (
                  <Link
                    key={row.k}
                    href={row.href}
                    style={{
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(15,17,40,0.75)',
                      padding: '8px 10px',
                      textDecoration: 'none',
                      textAlign: 'left',
                    }}
                    prefetch={false}
                  >
                    <span style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>{row.label}</span>
                    <span style={{ display: 'block', fontSize: 20, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2 }}>
                      {row.v.toLocaleString(th ? 'th-TH' : 'ko-KR')}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
            <p style={{ margin: '8px 0 0', fontSize: 10, fontWeight: 600, color: '#64748b' }}>{lastLine}</p>
            <p style={{ margin: '10px 0 0', fontSize: 10, fontWeight: 800, color: '#c4b5fd' }}>
              {th ? 'ลัด' : '빠른 이동'}
            </p>
            <div
              style={{
                marginTop: 4,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 6,
              }}
            >
              {quickLinks.map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  prefetch={false}
                  style={{
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(15,17,40,0.5)',
                    padding: '6px 8px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#e2e8f0',
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  {q.label}
                </Link>
              ))}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
              {th
                ? 'รายละเอียด กระดาน·ร้าน·ข่าว อยู่ทางล่าง'
                : '아래 라이트 구역: 광장·최신글·날씨·환율·배너가 한 화면에'}
            </p>
          </div>
        </div>
      </section>
    );
  }

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
