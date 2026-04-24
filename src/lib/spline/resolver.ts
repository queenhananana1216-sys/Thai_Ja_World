/**
 * Spline 장면 URL 결정 규칙 (우선순위)
 *
 * 1. Supabase `spline_scenes` 테이블에 row 가 있고 `is_enabled=true` 이면 그 값 사용.
 *    - `published_url` 이 있으면 iframe 경로, `scene_code_url` 이 있으면 react-spline 경로.
 * 2. 없으면 ENV 로 폴백:
 *    - `NEXT_PUBLIC_SPLINE_SCENE_<SLOT>`           → publishedUrl
 *    - `NEXT_PUBLIC_SPLINE_SCENECODE_<SLOT>`       → sceneCodeUrl
 *    - `NEXT_PUBLIC_SPLINE_FILE_<SLOT>`            → sourceFileId (추적용)
 *    - 레거시: `NEXT_PUBLIC_SPLINE_HERO_SCENE_URL` 는 `hero` 슬롯에만 폴백.
 * 3. 그래도 비면 **하드코딩 시드** (퍼블리시 URL + 편집 파일 ID) 사용.
 *    - 퍼블리시 URL 이 있으면 `SplineCanvas` 가 iframe/런타임 임베드.
 *    - URL 없고 파일 ID 만 있을 때는 플레이스홀더; DB/ENV 를 채우면 승격.
 *
 * 이 모듈은 서버에서만 임포트 (server-only)해 ENV / DB 접근을 노출하지 않는다.
 */
import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { SPLINE_SLOTS, type SplineSceneRecord, type SplineScenesBySlot, type SplineSlot } from './types';

/** 사용자 제공 Spline 편집 파일 ID — DB/ENV 미설정 시 추적용 폴백 (퍼블리시 URL 이 있으면 임베드에 우선 사용) */
const SPLINE_SEED_FILE_IDS: Record<SplineSlot, string> = {
  logo: '64ae0a21-6e2b-4f59-8f13-e0e8cd9913ff',
  hero: 'b3827bf1-ff8a-4d88-ad23-e868370705b6',
  accent1: '8638023d-8959-4e3d-bf50-071491fd7fd8',
  accent2: 'bfd8e621-fb84-4293-8a5f-cb5ac6b4ba3b',
  accent3: 'bfb41b7e-be1e-477e-839b-55bc1f28e071',
  accent4: '0722afe0-7e97-416b-bd5a-fdf7528f40f0',
};

/**
 * 퍼블리시된 공개 뷰어 URL (my.spline.design/...) — 2026-04-24 사용자 제공 5개.
 * 슬롯 6개 중 액센트4 는 동일 소스 1개를 재사용 (시각적 리듬 유지).
 */
const SPLINE_SEED_PUBLISHED_URLS: Record<SplineSlot, string> = {
  logo: 'https://my.spline.design/untitled-6MEZrYbp1Q8JjOqv4fPvflGo/',
  hero: 'https://my.spline.design/untitled-VNuwDHWlYGdhHyZRp7N0cLuJ/',
  accent1: 'https://my.spline.design/untitled-Dklf63Kz4NY2Y7hGH4TNbgxD/',
  accent2: 'https://my.spline.design/untitled-ICV6BBSwTo8WMeUdlEuI37qR/',
  accent3: 'https://my.spline.design/untitled-x483V0uq2y847YLaUqdPdkcv/',
  accent4: 'https://my.spline.design/untitled-x483V0uq2y847YLaUqdPdkcv/',
};

const SPLINE_SEED_PLACEMENT_HINT: Record<SplineSlot, string> = {
  logo: 'global-nav-left-logo',
  hero: 'landing-hero-background',
  accent1: 'landing-entry-flow-accent',
  accent2: 'landing-problem-accent',
  accent3: 'landing-testimonial-accent',
  accent4: 'landing-cta-accent',
};

function upper(slot: SplineSlot): string {
  return slot.toUpperCase();
}

function envLookup(slot: SplineSlot): Pick<SplineSceneRecord, 'publishedUrl' | 'sceneCodeUrl' | 'sourceFileId'> {
  const published = process.env[`NEXT_PUBLIC_SPLINE_SCENE_${upper(slot)}`]?.trim() ?? null;
  const sceneCode = process.env[`NEXT_PUBLIC_SPLINE_SCENECODE_${upper(slot)}`]?.trim() ?? null;
  const file = process.env[`NEXT_PUBLIC_SPLINE_FILE_${upper(slot)}`]?.trim() ?? null;
  // 레거시: 구버전에선 `NEXT_PUBLIC_SPLINE_HERO_SCENE_URL` 하나만 있었음.
  const legacyHero =
    slot === 'hero'
      ? process.env.NEXT_PUBLIC_SPLINE_HERO_SCENE_URL?.trim() ?? null
      : null;

  return {
    publishedUrl: isEmbeddable(published) ? published : legacyHero && isEmbeddable(legacyHero) ? legacyHero : null,
    sceneCodeUrl: isEmbeddable(sceneCode) ? sceneCode : null,
    sourceFileId: file ?? null,
  };
}

/** 에디터 링크(app.spline.design/file/...)·빈 값은 임베드 안 함 */
function isEmbeddable(value: string | null): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    if (u.hostname === 'app.spline.design') return false;
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function seedRecord(slot: SplineSlot): SplineSceneRecord {
  const rawPub = SPLINE_SEED_PUBLISHED_URLS[slot];
  const publishedUrl = isEmbeddable(rawPub) ? rawPub : null;
  return {
    slot,
    sourceFileId: SPLINE_SEED_FILE_IDS[slot] ?? null,
    publishedUrl,
    sceneCodeUrl: null,
    isEnabled: true,
    qualityTier: slot === 'hero' || slot === 'logo' ? 'high' : 'medium',
    placementHint: SPLINE_SEED_PLACEMENT_HINT[slot] ?? null,
  };
}

type DbRow = {
  slot: string;
  source_file_id: string | null;
  published_url: string | null;
  scene_code_url: string | null;
  is_enabled: boolean;
  quality_tier: 'low' | 'medium' | 'high' | string | null;
  placement_hint: string | null;
};

function normalizeQualityTier(v: DbRow['quality_tier']): SplineSceneRecord['qualityTier'] {
  return v === 'low' || v === 'medium' || v === 'high' ? v : 'high';
}

/** DB row 를 단일 슬롯 레코드로 변환 */
function fromDbRow(row: DbRow): SplineSceneRecord | null {
  if (!SPLINE_SLOTS.includes(row.slot as SplineSlot)) return null;
  return {
    slot: row.slot as SplineSlot,
    sourceFileId: row.source_file_id ?? null,
    publishedUrl: isEmbeddable(row.published_url) ? row.published_url : null,
    sceneCodeUrl: isEmbeddable(row.scene_code_url) ? row.scene_code_url : null,
    isEnabled: Boolean(row.is_enabled),
    qualityTier: normalizeQualityTier(row.quality_tier),
    placementHint: row.placement_hint ?? null,
  };
}

function mergeSlotLayer(
  base: SplineSceneRecord,
  overlay: Partial<SplineSceneRecord>,
): SplineSceneRecord {
  return {
    ...base,
    // override 는 값이 있는(= non-null) 필드만 적용
    sourceFileId: overlay.sourceFileId ?? base.sourceFileId,
    publishedUrl: overlay.publishedUrl ?? base.publishedUrl,
    sceneCodeUrl: overlay.sceneCodeUrl ?? base.sceneCodeUrl,
    isEnabled: overlay.isEnabled ?? base.isEnabled,
    qualityTier: overlay.qualityTier ?? base.qualityTier,
    placementHint: overlay.placementHint ?? base.placementHint,
  };
}

/**
 * 모든 슬롯을 한 번에 해결.
 * 실패 시(env·DB 모두 불가) 시드 값만으로 6슬롯을 반환 — 절대 throw 금지.
 */
export async function resolveSplineScenes(): Promise<SplineScenesBySlot> {
  const base: SplineScenesBySlot = Object.fromEntries(
    SPLINE_SLOTS.map((slot) => [slot, seedRecord(slot)]),
  ) as SplineScenesBySlot;

  // 1. ENV 병합
  for (const slot of SPLINE_SLOTS) {
    const e = envLookup(slot);
    base[slot] = mergeSlotLayer(base[slot], e);
  }

  // 2. DB 병합 (실패해도 ENV·시드 유지)
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('spline_scenes')
      .select('slot, source_file_id, published_url, scene_code_url, is_enabled, quality_tier, placement_hint');
    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[spline.resolveSplineScenes] DB 조회 에러 — env/seed 유지', error);
      }
    } else if (Array.isArray(data)) {
      for (const raw of data as DbRow[]) {
        const rec = fromDbRow(raw);
        if (!rec) continue;
        base[rec.slot] = mergeSlotLayer(base[rec.slot], rec);
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[spline.resolveSplineScenes] env/client 준비 실패 — env/seed 유지:', err);
    }
  }

  return base;
}
