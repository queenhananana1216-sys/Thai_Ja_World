/**
 * 홈 포털 띠(통합검색 아래) 퀵 링크 — /community, /news 등
 */
export const LANDING_PORTAL_QUICK_HREFS = [
  '/',
  '/tips',
  '/news',
  '/local',
  '/community/boards',
  '/community/boards?cat=info',
  '/community/trade',
  '/ilchon',
  '/minihome',
] as const;

export type LandingPortalQuickHref = (typeof LANDING_PORTAL_QUICK_HREFS)[number];
