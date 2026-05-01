/**
 * Google Geocoding API (REST). 키는 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — 클라이언트 전용 노출 키 전제.
 */
export type GeocodeOk = {
  lat: number;
  lng: number;
  formatted_address: string;
};

export type GeocodeResult = GeocodeOk | { error: string };

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const q = query.trim();
  if (!q) {
    return { error: 'empty_query' };
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    return { error: 'missing_google_maps_api_key' };
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', q);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return { error: `http_${res.status}` };
  }

  const body = (await res.json()) as {
    status: string;
    results?: { formatted_address: string; geometry: { location: { lat: number; lng: number } } }[];
    error_message?: string;
  };

  if (body.status !== 'OK' || !body.results?.[0]) {
    return { error: body.error_message || body.status || 'geocode_failed' };
  }

  const first = body.results[0];
  const loc = first.geometry?.location;
  if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') {
    return { error: 'invalid_geometry' };
  }

  return {
    lat: loc.lat,
    lng: loc.lng,
    formatted_address: first.formatted_address ?? q,
  };
}

export type ReverseGeocodeResult =
  | { formatted_address: string }
  | { error: string };

/** 좌표 → 주소 (Google Geocoding reverse) */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    return { error: 'missing_google_maps_api_key' };
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${lat},${lng}`);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return { error: `http_${res.status}` };
  }

  const body = (await res.json()) as {
    status: string;
    results?: { formatted_address: string }[];
    error_message?: string;
  };

  if (body.status !== 'OK' || !body.results?.[0]?.formatted_address) {
    return { error: body.error_message || body.status || 'reverse_geocode_failed' };
  }

  return { formatted_address: body.results[0].formatted_address };
}
