import 'server-only';

/**
 * Google Places API (New): Text Search + Place Details — 키는 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 * @see https://developers.google.com/maps/documentation/places/web-service/text-search
 */

export type KoreanBizCategory = 'mart' | 'pharmacy' | 'hospital';
export type KoreanBizRegion = 'bangkok' | 'pattaya' | 'chiangmai';

export type BizRadarSearchTask = {
  query: string;
  region: KoreanBizRegion;
  category: KoreanBizCategory;
};

/** 텍스트 검색 순회 — 지역·카테고리별 한국어/영어 혼합 쿼리 */
export const BIZ_RADAR_SEARCH_TASKS: BizRadarSearchTask[] = [
  { query: 'Bangkok Korean Mart', region: 'bangkok', category: 'mart' },
  { query: 'Bangkok Korean grocery', region: 'bangkok', category: 'mart' },
  { query: 'Bangkok Korean Pharmacy', region: 'bangkok', category: 'pharmacy' },
  { query: 'Bangkok Korean Hospital', region: 'bangkok', category: 'hospital' },
  { query: 'Pattaya Korean Mart', region: 'pattaya', category: 'mart' },
  { query: 'Pattaya Korean Pharmacy', region: 'pattaya', category: 'pharmacy' },
  { query: 'Pattaya Korean Hospital', region: 'pattaya', category: 'hospital' },
  { query: 'Chiang Mai Korean Mart', region: 'chiangmai', category: 'mart' },
  { query: 'Chiang Mai Korean Pharmacy', region: 'chiangmai', category: 'pharmacy' },
  { query: 'Chiang Mai Korean Hospital', region: 'chiangmai', category: 'hospital' },
];

/** `/api/admin/force-biz-sync` — 지역 편향 + 키워드 조합으로 초기 시드용 */
export const FORCE_BIZ_SYNC_SEARCH_TASKS: BizRadarSearchTask[] = [
  { query: 'Korean Mart', region: 'bangkok', category: 'mart' },
  { query: 'Korean Grocery', region: 'bangkok', category: 'mart' },
  { query: 'Korean Hospital', region: 'bangkok', category: 'hospital' },
  { query: 'Korean Clinic', region: 'bangkok', category: 'hospital' },
  { query: 'Korean Pharmacy', region: 'bangkok', category: 'pharmacy' },
  { query: 'Korean Mart', region: 'pattaya', category: 'mart' },
  { query: 'Korean Grocery', region: 'pattaya', category: 'mart' },
  { query: 'Korean Hospital', region: 'pattaya', category: 'hospital' },
  { query: 'Korean Clinic', region: 'pattaya', category: 'hospital' },
  { query: 'Korean Pharmacy', region: 'pattaya', category: 'pharmacy' },
  { query: 'Korean Mart', region: 'chiangmai', category: 'mart' },
  { query: 'Korean Grocery', region: 'chiangmai', category: 'mart' },
  { query: 'Korean Hospital', region: 'chiangmai', category: 'hospital' },
  { query: 'Korean Clinic', region: 'chiangmai', category: 'hospital' },
  { query: 'Korean Pharmacy', region: 'chiangmai', category: 'pharmacy' },
];

const REGION_BIAS: Record<
  KoreanBizRegion,
  { lat: number; lng: number; radiusM: number }
> = {
  bangkok: { lat: 13.7563, lng: 100.5018, radiusM: 50_000 },
  pattaya: { lat: 12.9236, lng: 100.8825, radiusM: 45_000 },
  chiangmai: { lat: 18.7883, lng: 98.9853, radiusM: 55_000 },
};

type TextSearchResult = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  business_status?: string;
};

type PlaceDetailsResponse = {
  status: string;
  error_message?: string;
  result?: {
    place_id?: string;
    /** Place API 응답 id(보통 place_id와 동일, 정규화 대조용) */
    google_resource_id?: string;
    name?: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    business_status?: string;
    opening_hours?: { weekday_text?: string[] };
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizePhone(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeAddr(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Legacy·Places(New) 혼용 enum 문자열 정규화 */
function normalizeBusinessStatus(status: string | undefined): string {
  if (status === undefined || status === '') return '';
  const u = status.toUpperCase();
  if (u.includes('OPERATIONAL')) return 'OPERATIONAL';
  return status;
}

export function isOperationalStatus(status: string | undefined): boolean {
  if (status === undefined || status === '') return true;
  return normalizeBusinessStatus(status) === 'OPERATIONAL';
}

export function mergeDetailIntoChange(params: {
  existingAddress: string | null;
  existingPhone: string | null;
  existingName: string;
  existingLat: number | null;
  existingLng: number | null;
  existingIsVerified: boolean;
  detail: NonNullable<PlaceDetailsResponse['result']>;
}): {
  changed: boolean;
  address: string | null;
  phone: string | null;
  name: string;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
} {
  const { detail } = params;
  const addr = detail.formatted_address ?? params.existingAddress;
  const phone =
    normalizePhone(detail.formatted_phone_number ?? detail.international_phone_number ?? '') ||
    params.existingPhone;
  const name = (detail.name ?? params.existingName).trim();
  const lat = detail.geometry?.location?.lat ?? params.existingLat;
  const lng = detail.geometry?.location?.lng ?? params.existingLng;
  const verified = isOperationalStatus(detail.business_status);

  const addrChanged = normalizeAddr(addr) !== normalizeAddr(params.existingAddress);
  const phoneChanged = normalizePhone(phone) !== normalizePhone(params.existingPhone);
  const nameChanged = name.trim() !== params.existingName.trim();
  const latChanged =
    lat != null && params.existingLat != null && Math.abs(lat - params.existingLat) > 1e-5;
  const lngChanged =
    lng != null && params.existingLng != null && Math.abs(lng - params.existingLng) > 1e-5;
  const coordInserted =
    (params.existingLat == null || params.existingLng == null) && lat != null && lng != null;
  const verifiedChanged = verified !== params.existingIsVerified;

  const changed =
    addrChanged ||
    phoneChanged ||
    nameChanged ||
    latChanged ||
    lngChanged ||
    coordInserted ||
    verifiedChanged;

  return {
    changed,
    address: addr ?? null,
    phone: phone ?? null,
    name,
    latitude: lat ?? null,
    longitude: lng ?? null,
    isVerified: verified,
  };
}

export async function placesDetails(params: {
  apiKey: string;
  placeId: string;
}): Promise<PlaceDetailsResponse> {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(params.placeId)}`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': params.apiKey,
      'X-Goog-FieldMask':
        'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,location,businessStatus,openingHours',
    },
    cache: 'no-store',
  });
  const json = (await res.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    location?: { latitude?: number; longitude?: number };
    businessStatus?: string;
    error?: { message?: string; status?: string; details?: unknown };
  };

  if (!res.ok) {
    if (res.status === 404) {
      return {
        status: 'NOT_FOUND',
        error_message: json.error?.message ?? 'place_not_found',
      };
    }
    return {
      status: 'REQUEST_DENIED',
      error_message: json.error?.message ?? `places_details_${res.status}`,
    };
  }

  const phoneFirst =
    normalizePhone(json.nationalPhoneNumber) || normalizePhone(json.internationalPhoneNumber);
  const loc = json.location;
  const biz = normalizeBusinessStatus(
    typeof json.businessStatus === 'string' ? json.businessStatus : '',
  );

  const resourceId = typeof json.id === 'string' && json.id.trim() ? json.id.trim() : params.placeId;
  return {
    status: 'OK',
    result: {
      place_id: params.placeId,
      google_resource_id: resourceId,
      name: json.displayName?.text ?? '',
      formatted_address: json.formattedAddress,
      formatted_phone_number: phoneFirst || undefined,
      international_phone_number: json.internationalPhoneNumber,
      geometry:
        loc != null
          ? { location: { lat: loc.latitude ?? undefined, lng: loc.longitude ?? undefined } }
          : undefined,
      business_status: biz || undefined,
    },
  };
}

/** Places API (New) Text Search — 페이지네이션은 nextPageToken */
export async function collectAllTextResults(input: {
  apiKey: string;
  query: string;
  region: KoreanBizRegion;
  maxPages?: number;
}): Promise<TextSearchResult[]> {
  const maxPages = input.maxPages ?? 3;
  const bias = REGION_BIAS[input.region];
  const out: TextSearchResult[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const body: Record<string, unknown> = {
      textQuery: input.query,
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: { latitude: bias.lat, longitude: bias.lng },
          radius: bias.radiusM,
        },
      },
    };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': input.apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = (await res.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        businessStatus?: string;
      }>;
      nextPageToken?: string;
      error?: { message?: string; code?: number; status?: string };
    };

    if (!res.ok) {
      throw new Error(data.error?.message ?? `places_searchText_${res.status}`);
    }

    const places = data.places ?? [];
    if (places.length === 0) break;

    for (const p of places) {
      if (!p.id) continue;
      out.push({
        place_id: p.id,
        name: p.displayName?.text,
        formatted_address: p.formattedAddress,
        geometry: p.location
          ? {
              location: {
                lat: p.location.latitude,
                lng: p.location.longitude,
              },
            }
          : undefined,
        business_status: p.businessStatus
          ? normalizeBusinessStatus(p.businessStatus)
          : undefined,
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
    await sleep(1200);
  }

  return out;
}

export { normalizeAddr, normalizePhone, sleep };
