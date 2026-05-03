/** DB·환경 변수가 비었을 때만 쓰는 기본 표시명 (레거시 카피 치환 기준 문자열과 동일 계열) */
export const DEFAULT_SITE_DISPLAY_NAME = '태국에, 살자';

/** 사전·메타 등에서 치환할 레거시 표기 (긴 구문을 앞에 둠) */
export const LEGACY_SITE_BRAND_PHRASES = [
  'Taeja World',
  'ThaiJa World',
  '태자월드',
  '태자 월드',
  '태국에 살자',
  '태국에, 살자',
] as const;
