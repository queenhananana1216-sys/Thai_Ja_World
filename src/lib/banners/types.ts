/**
 * Philgo 스타일 배너 시스템 — 타입 정의.
 * DB 테이블: public.premium_banners (044 + 098 마이그레이션).
 */

export const BANNER_PLACEMENTS = [
  'top_bar',
  'home_strip',
  'wing_left',
  'wing_right',
  'header_side',
  'in_content',
] as const;

export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

export const BANNER_ROUTE_GROUPS = [
  'all',
  'home',
  'community',
  'boards',
  'tips',
  'news',
  'local',
  'minihome',
] as const;

export type BannerRouteGroup = (typeof BANNER_ROUTE_GROUPS)[number];

/** 공개 배너 — 공용 select 필드만 (is_active / starts_at / ends_at 는 RLS 에서 필터됨) */
export type PublicBanner = {
  id: string;
  placement: BannerPlacement;
  routeGroup: BannerRouteGroup;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  href: string | null;
  badgeText: string | null;
  sponsorLabel: string | null;
  sortOrder: number;
  extra: Record<string, unknown>;
};

/** pathname → 가장 구체적인 routeGroup 1개 결정 (specific 우선) */
export function pathnameToRouteGroups(pathname: string): BannerRouteGroup[] {
  const p = pathname.toLowerCase();
  const groups: BannerRouteGroup[] = ['all'];
  if (p === '/' || p.startsWith('/landing')) groups.push('home');
  if (p.startsWith('/community/boards')) groups.push('community', 'boards');
  else if (p.startsWith('/community')) groups.push('community');
  if (p.startsWith('/tips')) groups.push('tips');
  if (p.startsWith('/news')) groups.push('news');
  if (p.startsWith('/local') || p.startsWith('/my-local-shop') || p.startsWith('/shop'))
    groups.push('local');
  if (p.startsWith('/minihome')) groups.push('minihome');
  return groups;
}
