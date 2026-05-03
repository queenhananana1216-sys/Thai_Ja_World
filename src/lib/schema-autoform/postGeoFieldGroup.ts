/**
 * posts 지오 컬럼(lat/lng/location_name) — AutoForm·API·파이프라인 공통 계약.
 * DB CHECK: 위도·경도는 둘 다 있거나 둘 다 없어야 함.
 */
export type PostGeoPayload = {
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
};

export function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function normalizePostGeoPayload(input: {
  latitude: string;
  longitude: string;
  location_name: string;
}): { ok: true; value: PostGeoPayload } | { ok: false; error: string } {
  const lat = parseOptionalNumber(input.latitude);
  const lng = parseOptionalNumber(input.longitude);
  const name = input.location_name.trim().slice(0, 120);

  if (lat == null && lng == null) {
    return {
      ok: true,
      value: { latitude: null, longitude: null, location_name: name || null },
    };
  }
  if (lat == null || lng == null) {
    return { ok: false, error: '위도와 경도는 둘 다 입력하거나 둘 다 비워 두세요.' };
  }
  if (lat < -90 || lat > 90) return { ok: false, error: '위도는 -90~90 범위여야 합니다.' };
  if (lng < -180 || lng > 180) return { ok: false, error: '경도는 -180~180 범위여야 합니다.' };
  return {
    ok: true,
    value: { latitude: lat, longitude: lng, location_name: name || null },
  };
}
