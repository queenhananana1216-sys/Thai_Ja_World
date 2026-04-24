/**
 * 태자월드 랜딩의 Spline 3D 배치 슬롯.
 *
 * - `logo`      : 글로벌 네비 좌측 로고 자리의 3D 로고
 * - `hero`      : 히어로 배경 메인 3D (`HeroSection` 뒤)
 * - `accent1..4`: 랜딩 각 섹션의 보조 3D 악센트 (EntryFlow, Problem, Testimonial, CTA 순)
 */
export const SPLINE_SLOTS = ['logo', 'hero', 'accent1', 'accent2', 'accent3', 'accent4'] as const;
export type SplineSlot = (typeof SPLINE_SLOTS)[number];

export interface SplineSceneRecord {
  slot: SplineSlot;
  /** Spline 에디터 파일 ID (app.spline.design/file/<uuid>) — 운영 추적용 */
  sourceFileId: string | null;
  /** 퍼블리시된 임베드 URL (my.spline.design/<slug>/) — iframe 으로 넣음 */
  publishedUrl: string | null;
  /** React Spline 컴포넌트용 씬 JSON URL (prod.spline.design/.../scene.splinecode) */
  sceneCodeUrl: string | null;
  isEnabled: boolean;
  /** 'low' | 'medium' | 'high' — 기기/네트워크 저사양에서 스킵 기준 */
  qualityTier: 'low' | 'medium' | 'high';
  /** 사람이 이해할 수 있는 배치 힌트 (예: "nav-left-logo") */
  placementHint: string | null;
}

export type SplineScenesBySlot = Record<SplineSlot, SplineSceneRecord>;
