export type BoardPostRow = {
  id: string;
  user_id: string;
  board_type: string;
  title: string;
  content: string;
  image_urls: string[];
  lat: number | null;
  lng: number | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  /** 마이그레이션 137 — 자동 큐레이션·피드 HOT */
  home_highlight?: boolean | null;
  auto_curated?: boolean | null;
  display_author_label?: string | null;
};
