/** 홈 하단 통합 피드 — 클라이언트·서버 공용 타입 (server-only 모듈에 넣지 않음) */
export type HomeUnifiedFeedItem = {
  kind: 'post' | 'job' | 'market';
  id: string;
  created_at: string;
  title: string;
  excerpt: string | null;
  category: string;
  comment_count: number;
  view_count: number;
  image_url: string | null;
  /** RPC가 주면 홈 피드 HOT 뱃지 등에 사용 */
  highlight?: boolean;
};
