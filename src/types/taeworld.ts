/**
 * src/types/taeworld.ts — 공개 UI 도메인 타입
 *
 * DB 컬럼(snake_case)과 1:1 매핑을 유지할 것.
 * 봇 전용 타입은 src/bots/types/botTypes.ts 참조.
 */

// ── 뉴스 ───────────────────────────────────────────────────────────────────

/** processed_news + raw_news + summaries JOIN 결과 (홈 피드용) */
export interface NewsItem {
  id: string;
  title: string;
  external_url: string;
  published_at: string | null;
  /** summaries.summary_text — 없으면 null (raw_news 폴백 시) */
  summary_text: string | null;
  /** processed_news id — 있으면 /news/[id] 내부 상세 */
  internalNewsId: string | null;
  /** 쿠키 로케일 변경 시 제목·요약 재계산 (있을 때만) */
  localeSource?: {
    clean_body: string | null;
    raw_title: string | null;
    summaries: { summary_text: string; model: string | null }[] | null;
  };
}

// ── 로컬 가게 ──────────────────────────────────────────────────────────────

export interface LocalBusiness {
  id: string;
  slug: string;
  name: string;
  category: string;
  region: string;
  description: string | null;
  image_url: string | null;
  emoji: string;
  tier: 'premium' | 'standard' | 'basic';
  is_recommended: boolean;
  has_discount: boolean;
  discount: string | null;
  tags: string[];
}

// ── 가게 공지 ──────────────────────────────────────────────────────────────

export interface ShopAnnouncement {
  id: string;
  business_id: string;
  kind: 'notice' | 'special_menu' | 'hours' | 'other';
  title: string | null;
  body: string;
  starts_at: string | null;
  ends_at: string | null;
  is_pinned: boolean;
  created_at: string;
}
