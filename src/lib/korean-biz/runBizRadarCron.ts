import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import {
  BIZ_RADAR_SEARCH_TASKS,
  FORCE_BIZ_SYNC_SEARCH_TASKS,
  collectAllTextResults,
  mergeDetailIntoChange,
  placesDetails,
  sleep,
  type BizRadarSearchTask,
  type KoreanBizCategory,
  type KoreanBizRegion,
} from '@/lib/korean-biz/bizRadarPlaces';

/** 방콕 → 파타야 → 치앙마이 순으로 한 번에 한 지역만 과부하 나지 않게 처리 */
const REGION_ORDER: KoreanBizRegion[] = ['bangkok', 'pattaya', 'chiangmai'];
const INTER_REGION_DELAY_MS = 1_500;
const INTER_TASK_DELAY_MS = 450;
/** Places Details / DB 왕복 사이 가벼운 스로틀 */
const INTER_PLACE_MS = 280;

export type BizRadarCronResult = {
  /** 텍스트 검색으로 유니크 place_id 처리 시도 횟수 */
  discoveryScanned: number;
  /** 신규 삽입된 행 수 */
  discoveryInserted: number;
  /** Place Details로 재검증 시도한 기존 행 수 */
  verificationChecked: number;
  /** 전화·주소·이름·좌표·영업상태 등 구글과 달라 DB 필드를 고친 행 수 */
  verificationFieldsUpdated: number;
  /** 구글 상세와 동일 — last_verified_at 만 최신 시각으로 갱신한 행 수 */
  verificationStampOnly: number;
  /** Place ID가 구글에서 더 이상 조회되지 않음 — 폐업·삭제 추정, is_verified=false 처리 */
  verificationMarkedInactive: number;
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

type VerifyOutcome =
  | 'fields_updated'
  | 'stamp_only'
  | 'marked_inactive'
  | false;

/**
 * 기존 행을 Place Details와 대조.
 * - 변경 있음 → 필드 UPDATE + last_verified_at
 * - 동일 → last_verified_at 만 갱신
 * - NOT_FOUND → is_verified=false + last_verified_at (목록에서 사라진 장소)
 */
async function verifyExistingRow(
  sb: ReturnType<typeof createServiceRoleClient>,
  apiKey: string,
  row: Row,
  errors: string[],
): Promise<VerifyOutcome> {
  const now = new Date().toISOString();
  const data = await placesDetails({ apiKey, placeId: row.google_place_id });

  if (data.status === 'NOT_FOUND') {
    const { error } = await sb
      .from('korean_businesses')
      .update({
        is_verified: false,
        last_verified_at: now,
      })
      .eq('id', row.id);
    if (error) {
      errors.push(`inactive ${row.google_place_id}: ${error.message}`);
      return false;
    }
    return 'marked_inactive';
  }

  if (data.status !== 'OK' || !data.result) {
    errors.push(
      `verify ${row.google_place_id}: ${data.error_message ?? data.status}`,
    );
    return false;
  }

  const detail = data.result;
  const merged = mergeDetailIntoChange({
    existingAddress: row.address,
    existingPhone: row.phone,
    existingName: row.name,
    existingLat: row.latitude,
    existingLng: row.longitude,
    existingIsVerified: row.is_verified,
    detail,
  });

  const canonicalId = (detail.google_resource_id ?? detail.place_id ?? row.google_place_id).trim();
  let newPlaceId: string | undefined;
  if (canonicalId !== row.google_place_id) {
    const { data: other } = await sb
      .from('korean_businesses')
      .select('id')
      .eq('google_place_id', canonicalId)
      .maybeSingle();
    const oid = other as { id: string } | null;
    if (!oid) newPlaceId = canonicalId;
    else if (oid.id !== row.id) {
      errors.push(`place_id remap skipped ${row.google_place_id} → ${canonicalId}: row exists`);
    }
  }

  const needsFieldWrite = merged.changed || Boolean(newPlaceId);

  if (needsFieldWrite) {
    const patch: Record<string, unknown> = {
      name: merged.name,
      address: merged.address,
      phone: merged.phone,
      latitude: merged.latitude,
      longitude: merged.longitude,
      is_verified: merged.isVerified,
      last_verified_at: now,
    };
    if (newPlaceId) patch.google_place_id = newPlaceId;

    const { error } = await sb.from('korean_businesses').update(patch).eq('id', row.id);
    if (error) {
      errors.push(`update ${row.google_place_id}: ${error.message}`);
      return false;
    }
    return 'fields_updated';
  }

  const { error: stampErr } = await sb
    .from('korean_businesses')
    .update({ last_verified_at: now })
    .eq('id', row.id);
  if (stampErr) {
    errors.push(`stamp ${row.google_place_id}: ${stampErr.message}`);
    return false;
  }
  return 'stamp_only';
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

type RunBizRadarOptions = {
  maxPages?: number;
  /** true면 신규 발견만 수행(Place Details 갱신 루프 생략) */
  skipVerification?: boolean;
};

export async function runBizRadarCronForTasks(
  tasks: BizRadarSearchTask[],
  options?: RunBizRadarOptions,
): Promise<BizRadarCronResult> {
  const maxPages = options?.maxPages ?? 2;
  const skipVerification = options?.skipVerification ?? false;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const result: BizRadarCronResult = {
    discoveryScanned: 0,
    discoveryInserted: 0,
    verificationChecked: 0,
    verificationFieldsUpdated: 0,
    verificationStampOnly: 0,
    verificationMarkedInactive: 0,
    errors: [],
  };

  if (!apiKey) {
    result.errors.push('missing_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
    return result;
  }

  const sb = createServiceRoleClient();
  const seenPlaceIds = new Set<string>();
  const insertedPlaceIds = new Set<string>();

  for (let ri = 0; ri < REGION_ORDER.length; ri += 1) {
    const region = REGION_ORDER[ri]!;
    const regionTasks = tasks.filter((t) => t.region === region);
    if (regionTasks.length === 0) continue;

    for (const task of regionTasks) {
      let results: Awaited<ReturnType<typeof collectAllTextResults>>;
      try {
        results = await collectAllTextResults({
          apiKey,
          query: task.query,
          region: task.region,
          maxPages,
        });
      } catch (e) {
        result.errors.push(
          `search "${task.query}": ${e instanceof Error ? e.message : String(e)}`,
        );
        await sleep(INTER_TASK_DELAY_MS);
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
          await sleep(INTER_PLACE_MS);
          continue;
        }

        if (!existing) {
          const ok = await insertNewPlace(sb, apiKey, task, pid, result.errors);
          if (ok) {
            result.discoveryInserted += 1;
            insertedPlaceIds.add(pid);
          }
          await sleep(INTER_PLACE_MS);
        }
      }

      await sleep(INTER_TASK_DELAY_MS);
    }

    if (ri < REGION_ORDER.length - 1) {
      await sleep(INTER_REGION_DELAY_MS);
    }
  }

  if (skipVerification) {
    return result;
  }

  for (let vi = 0; vi < REGION_ORDER.length; vi += 1) {
    const region = REGION_ORDER[vi]!;
    const { data: regionRows, error: listErr } = await sb
      .from('korean_businesses')
      .select(
        'id, google_place_id, name, category, region, address, phone, latitude, longitude, is_verified, last_verified_at',
      )
      .eq('region', region);

    if (listErr) {
      result.errors.push(`list_${region}: ${listErr.message}`);
      await sleep(INTER_REGION_DELAY_MS);
      continue;
    }

    for (const row of regionRows ?? []) {
      const r = row as Row;
      if (insertedPlaceIds.has(r.google_place_id)) continue;
      result.verificationChecked += 1;
      try {
        const outcome = await verifyExistingRow(sb, apiKey, r, result.errors);
        if (outcome === 'fields_updated') result.verificationFieldsUpdated += 1;
        else if (outcome === 'stamp_only') result.verificationStampOnly += 1;
        else if (outcome === 'marked_inactive') result.verificationMarkedInactive += 1;
      } catch (e) {
        result.errors.push(
          `verify ${r.google_place_id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      await sleep(INTER_PLACE_MS);
    }

    if (vi < REGION_ORDER.length - 1) {
      await sleep(INTER_REGION_DELAY_MS);
    }
  }

  return result;
}

export async function runBizRadarCron(): Promise<BizRadarCronResult> {
  return runBizRadarCronForTasks(BIZ_RADAR_SEARCH_TASKS, { maxPages: 2 });
}

/** 관리자 강제 시드: 키워드·지역 넓게 검색, 기존 행 Details 갱신은 생략 */
export async function runForceBizSyncSeed(): Promise<BizRadarCronResult> {
  return runBizRadarCronForTasks(FORCE_BIZ_SYNC_SEARCH_TASKS, {
    maxPages: 4,
    skipVerification: true,
  });
}
