/** `/korean-biz` · `fetchKoreanBusinesses` 공통 — 클라이언트/서버 공유 타입(데이터만). */
export type KoreanBizCategory =
  | 'mart'
  | 'pharmacy'
  | 'hospital'
  | 'vehicle_rent'
  | 'golf'
  | 'massage_spa';

export type KoreanBizRow = {
  id: string;
  google_place_id: string;
  name: string;
  category: KoreanBizCategory;
  region: 'bangkok' | 'pattaya' | 'chiangmai';
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  last_verified_at: string | null;
  line_url?: string | null;
  whatsapp_url?: string | null;
  contact_checked_at?: string | null;
  contact_link_ok?: boolean | null;
};
