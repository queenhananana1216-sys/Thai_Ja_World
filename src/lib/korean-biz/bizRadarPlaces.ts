import 'server-only';

/**
 * Google Places (Legacy) Text Search + Place Details — 키는 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 * @see https://developers.google.com/maps/documentation/places/web-service/search-text
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

type TextSearchResponse = {
  status: string;
  error_message?: string;
  results?: TextSearchResult[];
  next_page_token?: string;
};

type PlaceDetailsResponse = {
  status: string;
  error_message?: string;
  result?: {
    place_id?: string;
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

export function isOperationalStatus(status: string | undefined): boolean {
  return status === 'OPERATIONAL' || status === undefined || status === '';
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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`places_http_${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function placesTextSearchPage(params: {
  apiKey: string;
  query: string;
  region: KoreanBizRegion;
  pageToken?: string;
}): Promise<TextSearchResponse> {
  const bias = REGION_BIAS[params.region];
  const u = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  u.searchParams.set('query', params.query);
  u.searchParams.set('key', params.apiKey);
  u.searchParams.set('location', `${bias.lat},${bias.lng}`);
  u.searchParams.set('radius', String(bias.radiusM));
  if (params.pageToken) {
    u.searchParams.set('pagetoken', params.pageToken);
  }
  return fetchJson<TextSearchResponse>(u.toString());
}

export async function placesDetails(params: {
  apiKey: string;
  placeId: string;
}): Promise<PlaceDetailsResponse> {
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'geometry',
    'business_status',
    'opening_hours',
  ].join(',');
  const u = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  u.searchParams.set('place_id', params.placeId);
  u.searchParams.set('fields', fields);
  u.searchParams.set('key', params.apiKey);
  return fetchJson<PlaceDetailsResponse>(u.toString());
}

/** next_page_token 은 짧은 지연 후에만 유효 */
export async function collectAllTextResults(input: {
  apiKey: string;
  query: string;
  region: KoreanBizRegion;
  maxPages?: number;
}): Promise<TextSearchResult[]> {
  const maxPages = input.maxPages ?? 3;
  const out: TextSearchResult[] = [];
  let token: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const data = await placesTextSearchPage({
      apiKey: input.apiKey,
      query: input.query,
      region: input.region,
      pageToken: token,
    });
    if (data.status === 'ZERO_RESULTS') break;
    if (data.status === 'INVALID_REQUEST' && !token) {
      throw new Error(data.error_message ?? 'textsearch_INVALID_REQUEST');
    }
    if (data.status !== 'OK' && data.status !== 'INVALID_REQUEST') {
      throw new Error(data.error_message ?? `textsearch_${data.status}`);
    }
    if (data.status === 'INVALID_REQUEST' && token) {
      await sleep(2500);
      page -= 1;
      continue;
    }
    for (const r of data.results ?? []) {
      out.push(r);
    }
    token = data.next_page_token;
    if (!token) break;
    await sleep(2100);
  }
  return out;
}

export { normalizeAddr, normalizePhone, sleep };
