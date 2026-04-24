'use client';

/**
 * SplineCanvas — 통합 Spline 임베드 컴포넌트 (5개 랜딩 슬롯에서 공통 사용)
 *
 * 폴백 순서:
 *  1. `sceneCodeUrl` (prod.spline.design/.../scene.splinecode) 가 있으면 `@splinetool/react-spline` 로 로드.
 *  2. 그 외 `publishedUrl` (my.spline.design/<slug>/) 이 있으면 iframe 임베드.
 *  3. 둘 다 없거나 임베드 불가(에디터 링크·잘못된 도메인) 면 `gradient` 플레이스홀더.
 *
 * `quality='low'` 이거나 모바일/데이터 절약 모드면 자동 플레이스홀더 — 빈 페이지로 보이지 않게.
 */
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

type SplineCanvasProps = {
  publishedUrl?: string | null;
  sceneCodeUrl?: string | null;
  /** 'hero' | 'logo' | 'accent*' — 주석/디버깅용 */
  slot?: string;
  /** 'low' 면 임베드 스킵, 'medium' / 'high' 는 로드 */
  quality?: 'low' | 'medium' | 'high';
  /** 가로세로 채움 (iframe 모드) */
  fill?: boolean;
  title?: string;
  /** 플레이스홀더 톤 — 기본 dark, logo 슬롯은 light 로 가볍게 */
  placeholderTone?: 'dark' | 'light';
  /** 추가 style */
  style?: CSSProperties;
};

function GradientPlaceholder({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const background =
    tone === 'light'
      ? 'radial-gradient(circle at 30% 30%, rgba(244,182,226,0.35) 0%, rgba(196,181,253,0.2) 45%, rgba(167,139,250,0.08) 100%)'
      : 'radial-gradient(circle at 20% 20%, #3b1f5a 0%, #151235 42%, #070812 100%)';
  return (
    <div
      aria-hidden
      style={{
        height: '100%',
        width: '100%',
        background,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: '100%',
          background:
            'linear-gradient(120deg,rgba(196,181,253,0.1),transparent 45%,rgba(249,168,212,0.1))',
        }}
      />
    </div>
  );
}

function useClientQuality(explicit?: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' {
  const [tier, setTier] = useState<'low' | 'medium' | 'high'>(explicit ?? 'high');

  useEffect(() => {
    if (explicit === 'low') {
      setTier('low');
      return;
    }
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    const memory = nav.deviceMemory ?? 4;
    const cores = nav.hardwareConcurrency ?? 4;
    const saveData = Boolean(nav.connection?.saveData);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;

    if (saveData || reducedMotion) {
      setTier('low');
      return;
    }
    if (isMobile && (memory <= 2 || cores <= 4)) {
      setTier('low');
      return;
    }
    setTier(explicit ?? 'high');
  }, [explicit]);

  return tier;
}

export function SplineCanvas({
  publishedUrl,
  sceneCodeUrl,
  slot,
  quality,
  fill = true,
  title,
  placeholderTone = 'dark',
  style,
}: SplineCanvasProps) {
  const clientQuality = useClientQuality(quality);

  const canRenderSceneCode = useMemo(
    () =>
      typeof sceneCodeUrl === 'string' &&
      sceneCodeUrl.length > 0 &&
      !sceneCodeUrl.includes('app.spline.design/file/'),
    [sceneCodeUrl],
  );

  const canRenderIframe = useMemo(
    () =>
      typeof publishedUrl === 'string' &&
      publishedUrl.length > 0 &&
      !publishedUrl.includes('app.spline.design/file/'),
    [publishedUrl],
  );

  const wrapperStyle: CSSProperties = {
    width: fill ? '100%' : undefined,
    height: fill ? '100%' : undefined,
    overflow: 'hidden',
    ...style,
  };

  if (clientQuality === 'low') {
    return (
      <div data-spline-slot={slot} data-spline-mode="placeholder-lowq" style={wrapperStyle}>
        <GradientPlaceholder tone={placeholderTone} />
      </div>
    );
  }

  if (canRenderSceneCode) {
    return (
      <div data-spline-slot={slot} data-spline-mode="scene-code" style={wrapperStyle}>
        <Suspense fallback={<GradientPlaceholder tone={placeholderTone} />}>
          <Spline
            scene={sceneCodeUrl!}
            style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
          />
        </Suspense>
      </div>
    );
  }

  if (canRenderIframe) {
    return (
      <div data-spline-slot={slot} data-spline-mode="iframe" style={wrapperStyle}>
        <iframe
          src={publishedUrl!}
          title={title ?? `Thai Ja World 3D (${slot ?? 'scene'})`}
          loading="lazy"
          allow="autoplay; fullscreen"
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            pointerEvents: 'none',
          }}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div data-spline-slot={slot} data-spline-mode="placeholder-empty" style={wrapperStyle}>
      <GradientPlaceholder tone={placeholderTone} />
    </div>
  );
}

export default SplineCanvas;
