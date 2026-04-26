/**
 * /portal Supabase 연동용 — API·RSC에서 동일 스키마로 직렬화
 */

/** `public.jobs` — 구인구직 (097 마이그레이션) */
export interface JobPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  salary: string | null;
  salary_period: string;
  company_name: string | null;
  location: string | null;
  employment_type: string;
  visa_requirement: string | null;
  contact_hint: string | null;
  image_urls: string[] | null;
  moderation_status: string;
  author_hidden: boolean;
}

/** `public.market` — 번개장터 (097 마이그레이션) */
export interface MarketPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  price_amount: number | null;
  price_currency: string;
  price_display: string | null;
  item_condition: string;
  status: string;
  location: string | null;
  image_urls: string[] | null;
  moderation_status: string;
  author_hidden: boolean;
}

/** `posts` 테이블에서 포털 피드에 쓰는 최소 컬럼 */
export interface PortalPostRow {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  category: string;
  created_at: string;
  comment_count: number | null;
  view_count: number | null;
  image_urls: string[] | null;
}

/** `get_popular_posts` RPC 반환 (071 마이그레이션) */
export interface PopularPostRow {
  id: string;
  title: string;
  author_name: string;
  category: string;
  reaction_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
}

/** `premium_banners` — portal_hero 슬롯 (096 마이그레이션) */
export interface PremiumBannerRow {
  id: string;
  slot: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  href: string | null;
  badge_text: string | null;
  sort_order: number;
}

export interface PortalWeatherSnapshot {
  tempC: number;
  humidityPct: number | null;
  conditionKo: string;
  city: string;
}

export interface PortalFxSnapshot {
  thbKrw: string | null;
  usdThb: string | null;
  usdKrw: string | null;
  updatedLabel: string | null;
}
