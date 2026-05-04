import 'server-only';

import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

const MIN_ROWS = 10;

/** 서비스 롤 자가 치유 시드 — 연락처는 비워 두고 지도·업종만 제공(가짜 번호 노출 방지) */
const MINIMAL_SELF_HEAL: Array<{
  google_place_id: string;
  name: string;
  category: 'mart' | 'pharmacy' | 'hospital';
  region: 'bangkok' | 'pattaya' | 'chiangmai';
  address: string;
  latitude: number;
  longitude: number;
}> = [
  {
    google_place_id: 'taeja_sh_bkk_m1',
    name: '방콕 한인마트 라이브(자가치유)',
    category: 'mart',
    region: 'bangkok',
    address: 'Sukhumvit · 방콕',
    latitude: 13.7367,
    longitude: 100.5631,
  },
  {
    google_place_id: 'taeja_sh_bkk_p1',
    name: '방콕 한인약국 큐레이션(자가치유)',
    category: 'pharmacy',
    region: 'bangkok',
    address: 'Thonglor · 방콕',
    latitude: 13.7244,
    longitude: 100.5841,
  },
  {
    google_place_id: 'taeja_sh_bkk_h1',
    name: '방콕 한인 클리닉 허브(자가치유)',
    category: 'hospital',
    region: 'bangkok',
    address: 'Asok · 방콕',
    latitude: 13.7379,
    longitude: 100.5604,
  },
  {
    google_place_id: 'taeja_sh_ptt_m1',
    name: '파타야 한인마트 스파크(자가치유)',
    category: 'mart',
    region: 'pattaya',
    address: 'Beach Rd · 파타야',
    latitude: 12.9316,
    longitude: 100.8829,
  },
  {
    google_place_id: 'taeja_sh_ptt_p1',
    name: '파타야 한인약국(자가치유)',
    category: 'pharmacy',
    region: 'pattaya',
    address: 'Jomtien · 파타야',
    latitude: 12.8771,
    longitude: 100.8797,
  },
  {
    google_place_id: 'taeja_sh_ptt_h1',
    name: '파타야 한인 클리닉(자가치유)',
    category: 'hospital',
    region: 'pattaya',
    address: 'Central Pattaya',
    latitude: 12.9236,
    longitude: 100.8825,
  },
  {
    google_place_id: 'taeja_sh_cm_m1',
    name: '치앙마이 한인마트 님만(자가치유)',
    category: 'mart',
    region: 'chiangmai',
    address: 'Nimman · 치앙마이',
    latitude: 18.7961,
    longitude: 98.9793,
  },
  {
    google_place_id: 'taeja_sh_cm_p1',
    name: '치앙마이 한약국(자가치유)',
    category: 'pharmacy',
    region: 'chiangmai',
    address: 'Old City',
    latitude: 18.7883,
    longitude: 98.9853,
  },
  {
    google_place_id: 'taeja_sh_cm_h1',
    name: '치앙마이 한인 클리닉(자가치유)',
    category: 'hospital',
    region: 'chiangmai',
    address: 'Chang Khlan',
    latitude: 18.7815,
    longitude: 99.0067,
  },
  {
    google_place_id: 'taeja_sh_bkk_m2',
    name: '방콕 한인마트 세컨(자가치유)',
    category: 'mart',
    region: 'bangkok',
    address: 'Ekkamai · 방콕',
    latitude: 13.7267,
    longitude: 100.5851,
  },
];

/**
 * 목록이 비었거나 너무 적을 때 서비스 롤로 최소 행을 채운다.
 */
export async function ensureKoreanBizMinimumRows(): Promise<{ inserted: number; skipped: boolean }> {
  if (!isServiceRoleConfigured()) return { inserted: 0, skipped: true };
  const admin = createServiceRoleClient();
  const { count, error: cErr } = await admin
    .from('korean_businesses')
    .select('id', { count: 'exact', head: true });
  if (cErr) {
    console.warn('[ensureKoreanBizMinimumRows] count', cErr.message);
    return { inserted: 0, skipped: true };
  }
  const n = typeof count === 'number' ? count : 0;
  if (n >= MIN_ROWS) return { inserted: 0, skipped: true };

  const now = new Date().toISOString();
  let inserted = 0;
  for (const row of MINIMAL_SELF_HEAL) {
    const { error } = await admin.from('korean_businesses').upsert(
      {
        google_place_id: row.google_place_id,
        name: row.name,
        category: row.category,
        region: row.region,
        address: row.address,
        phone: null,
        latitude: row.latitude,
        longitude: row.longitude,
        is_verified: false,
        last_verified_at: now,
      },
      { onConflict: 'google_place_id' },
    );
    if (!error) inserted += 1;
    else console.warn('[ensureKoreanBizMinimumRows]', row.google_place_id, error.message);
  }
  return { inserted, skipped: false };
}
