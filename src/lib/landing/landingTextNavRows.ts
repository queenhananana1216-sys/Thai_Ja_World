/**
 * 랜딩 상단 "필고 스타일" 2줄 텍스트 메뉴 — href 는 SITE_SEARCH_ENTRIES 와 1:1
 * (라벨·검색어는 siteSearchEntries.ts)
 */
export const LANDING_TEXT_NAV_ROW_A = [
  '/tips',
  '/news',
  '/local',
  '/help/emergency',
  '/community/boards',
  '/community/boards?cat=info',
  '/community/boards?cat=restaurant',
  '/community/trade',
  '/minihome/shop',
  '/ilchon',
] as const;

export const LANDING_TEXT_NAV_ROW_B = [
  '/chat',
  '/minihome',
  '/community/boards?cat=free',
  '/community/boards?cat=intro',
  '/community/boards?cat=flea',
  '/community/boards?cat=job',
  '/auth/login',
  '/auth/signup',
] as const;
