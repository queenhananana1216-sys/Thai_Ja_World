import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import {
  BIZ_RADAR_SEARCH_TASKS,
  collectAllTextResults,
  mergeDetailIntoChange,
  placesDetails,
  type BizRadarSearchTask,
  type KoreanBizCategory,
  type KoreanBizRegion,
} from '@/lib/korean-biz/bizRadarPlaces';

export type BizRadarCronResult = {
  /** 텍스트 검색으로 유니크 place_id 처리 시도 횟수 */
  discoveryScanned: number;
  /** 신규 삽입된 행 수 */
  discoveryInserted: number;
  verificationChecked: number;
  verificationUpdated: number;
  errors: string[];
};

type Row = {
  id: string;
  google_place_id: string;
  name: string;
  category: KoreanBizCategory;
  region: KoreanBizRegion;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  last_verified_at: string | null;
};

async function fetchPlaceDetail(apiKey: string, placeId: string) {
  const data = await placesDetails({ apiKey, placeId });
  if (data.status !== 'OK' || !data.result) {
    throw new Error(data.error_message ?? `details_${data.status}`);
  }
  return data.result;
}

/** 신규 발견: 상세 조회 후 삽입 — 카테고리·지역은 태스크 기준 */
async function insertNewPlace(
  sb: ReturnType<typeof createServiceRoleClient>,
  apiKey: string,
  task: BizRadarSearchTask,
  placeId: string,
  errors: string[],
): Promise<boolean> {
  try {
    const detail = await fetchPlaceDetail(apiKey, placeId);
    const merged = mergeDetailIntoChange({
      existingAddress: null,
      existingPhone: null,
      existingName: detail.name ?? 'Unknown',
      existingLat: null,
      existingLng: null,
      existingIsVerified: true,
      detail,
    });
    const now = new Date().toISOString();
    const { error } = await sb.from('korean_businesses').insert({
      google_place_id: placeId,
      name: merged.name,
      category: task.category,
      region: task.region,
      address: merged.address,
      phone: merged.phone,
      latitude: merged.latitude,
      longitude: merged.longitude,
      is_verified: merged.isVerified,
      last_verified_at: now,
    });
    if (error) {
      errors.push(`insert ${placeId}: ${error.message}`);
      return false;
    }
    return true;
  } catch (e) {
    errors.push(`insert ${placeId}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

/** 기존 행 갱신: 주소·전화 등만 상세 기준으로 — 카테고리/지역 유지 */
async function refreshExistingFromDetail(
  sb: ReturnType<typeof createServiceRoleClient>,
  apiKey: string,
  row: Row,
  errors: string[],
): Promise<boolean> {
  try {
    const detail = await fetchPlaceDetail(apiKey, row.google_place_id);
    const merged = mergeDetailIntoChange({
      existingAddress: row.address,
      existingPhone: row.phone,
      existingName: row.name,
      existingLat: row.latitude,
      existingLng: row.longitude,
      existingIsVerified: row.is_verified,
      detail,
    });
    if (!merged.changed) return false;

    const now = new Date().toISOString();
    const { error } = await sb
      .from('korean_businesses')
      .update({
        name: merged.name,
        address: merged.address,
        phone: merged.phone,
        latitude: merged.latitude,
        longitude: merged.longitude,
        is_verified: merged.isVerified,
        last_verified_at: now,
      })
      .eq('id', row.id);
    if (error) {
      errors.push(`update ${row.google_place_id}: ${error.message}`);
      return false;
    }
    return true;
  } catch (e) {
    errors.push(`refresh ${row.google_place_id}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

export async function runBizRadarCron(): Promise<BizRadarCronResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const result: BizRadarCronResult = {
    discoveryScanned: 0,
    discoveryInserted: 0,
    verificationChecked: 0,
    verificationUpdated: 0,
    errors: [],
  };

  if (!apiKey) {
    result.errors.push('missing_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
    return result;
  }

  const sb = createServiceRoleClient();
  const seenPlaceIds = new Set<string>();
  const insertedPlaceIds = new Set<string>();

  for (const task of BIZ_RADAR_SEARCH_TASKS) {
    let results: Awaited<ReturnType<typeof collectAllTextResults>>;
    try {
      results = await collectAllTextResults({
        apiKey,
        query: task.query,
        region: task.region,
        maxPages: 2,
      });
    } catch (e) {
      result.errors.push(
        `search "${task.query}": ${e instanceof Error ? e.message : String(e)}`,
      );
      continue;
    }

    for (const r of results) {
      const pid = r.place_id;
      if (!pid || seenPlaceIds.has(pid)) continue;
      seenPlaceIds.add(pid);
      result.discoveryScanned += 1;

      const { data: existing, error: exErr } = await sb
        .from('korean_businesses')
        .select(
          'id, google_place_id, name, category, region, address, phone, latitude, longitude, is_verified, last_verified_at',
        )
        .eq('google_place_id', pid)
        .maybeSingle();

      if (exErr) {
        result.errors.push(`lookup ${pid}: ${exErr.message}`);
        continue;
      }

      if (!existing) {
        const ok = await insertNewPlace(sb, apiKey, task, pid, result.errors);
        if (ok) {
          result.discoveryInserted += 1;
          insertedPlaceIds.add(pid);
        }
      }
    }
  }

  const { data: allRows, error: listErr } = await sb
    .from('korean_businesses')
    .select(
      'id, google_place_id, name, category, region, address, phone, latitude, longitude, is_verified, last_verified_at',
    );

  if (listErr) {
    result.errors.push(`list_all: ${listErr.message}`);
    return result;
  }

  for (const row of allRows ?? []) {
    const r = row as Row;
    if (insertedPlaceIds.has(r.google_place_id)) continue;
    result.verificationChecked += 1;
    const ok = await refreshExistingFromDetail(sb, apiKey, r, result.errors);
    if (ok) result.verificationUpdated += 1;
  }

  return result;
}
