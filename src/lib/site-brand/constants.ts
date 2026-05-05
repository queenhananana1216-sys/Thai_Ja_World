/** DB·환경 변수가 비었을 때만 쓰는 기본 표시명 (레거시 카피 치환 기준 문자열과 동일 계열) */
export const DEFAULT_SITE_DISPLAY_NAME = '태국에, 살자';

/**
 * site_settings·환경 변수에 옛 브랜드가 남아 있어도 공개 UI·메타에는 현재 표시명만 쓰도록 정규화합니다.
 */
export function normalizeSiteDisplayNameForUi(raw: string): string {
  const t = raw.trim().slice(0, 120);
  if (!t) return DEFAULT_SITE_DISPLAY_NAME;
  const collapsed = t.replace(/\s+/g, ' ');
  const lower = collapsed.toLowerCase();
  if (lower.includes('taeja') || lower.includes('thaija')) return DEFAULT_SITE_DISPLAY_NAME;
  if (collapsed.includes('태자')) return DEFAULT_SITE_DISPLAY_NAME;
  if (collapsed === '태국에 살자') return DEFAULT_SITE_DISPLAY_NAME;
  return collapsed;
}

/** 사전·메타 등에서 치환할 레거시 표기 (긴 구문을 앞에 둠). UI 카피에 넣지 말 것 — 탐지·치환 전용. */
export const LEGACY_SITE_BRAND_PHRASES = [
  'Taeja World',
  'ThaiJa World',
  '태자월드',
  '태자 월드',
  '태국에 살자',
  '태국에, 살자',
] as const;
