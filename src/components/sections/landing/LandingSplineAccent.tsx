'use client';

/**
 * 랜딩 섹션 경계에 얹는 Spline 액센트. 3D 장면이 비어 있을 땐 아예 DOM 을
 * 그리지 않아 섹션 사이 간격이 벌어지지 않는다 (빈 페이지 느낌 방지).
 */
import type { CSSProperties } from 'react';
import { SplineCanvas } from '@/components/3d/SplineCanvas';
import type { SplineSceneRecord } from '@/lib/spline/types';

type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type Props = {
  scene: SplineSceneRecord;
  position?: Position;
  /** 높이 기본 220px — 섹션 밖으로 너무 튀지 않게 */
  height?: number;
};

const SIDE_OFFSETS: Record<Position, CSSProperties> = {
  'top-left': { top: -80, left: -40 },
  'top-right': { top: -80, right: -40 },
  'bottom-left': { bottom: -80, left: -40 },
  'bottom-right': { bottom: -80, right: -40 },
};

export function LandingSplineAccent({ scene, position = 'top-right', height = 220 }: Props) {
  if (!scene.isEnabled) return null;
  const hasAny = Boolean(scene.sceneCodeUrl || scene.publishedUrl);
  if (!hasAny) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        height: 0,
        overflow: 'visible',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 320,
          height,
          opacity: 0.45,
          filter: 'blur(0.5px)',
          ...SIDE_OFFSETS[position],
        }}
      >
        <SplineCanvas
          slot={scene.slot}
          publishedUrl={scene.publishedUrl}
          sceneCodeUrl={scene.sceneCodeUrl}
          quality={scene.qualityTier}
          placeholderTone="dark"
          title={scene.placementHint ?? scene.slot}
        />
      </div>
    </div>
  );
}
