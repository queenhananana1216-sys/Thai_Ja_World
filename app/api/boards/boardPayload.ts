export type BoardType = 'free' | 'info';

export type BoardPostPayload = {
  board_type: BoardType;
  title: string;
  content: string;
  image_urls: string[];
  lat: number | null;
  lng: number | null;
  address: string | null;
};

function toBoardType(v: unknown): BoardType | null {
  if (v === 'free' || v === 'info') return v;
  return null;
}

function toOptionalFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function parseBoardPostBody(raw: Record<string, unknown>): {
  ok: true;
  payload: BoardPostPayload;
} | { ok: false; error: string } {
  const board_type = toBoardType(raw.board_type);
  if (!board_type) {
    return { ok: false, error: 'invalid_board_type' };
  }

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (title.length < 1 || title.length > 200) {
    return { ok: false, error: 'invalid_title' };
  }

  const content = typeof raw.content === 'string' ? raw.content : '';
  if (content.length > 50_000) {
    return { ok: false, error: 'content_too_long' };
  }

  let image_urls: string[] = [];
  if (Array.isArray(raw.image_urls)) {
    image_urls = raw.image_urls.map((x) => String(x).trim()).filter(Boolean).slice(0, 30);
  }

  const lat = toOptionalFiniteNumber(raw.lat);
  const lng = toOptionalFiniteNumber(raw.lng);
  if ((lat === null) !== (lng === null)) {
    return { ok: false, error: 'lat_lng_pair_required' };
  }
  if (lat !== null && lng !== null) {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { ok: false, error: 'invalid_coordinates' };
    }
  }

  let address: string | null = null;
  if (typeof raw.address === 'string') {
    const a = raw.address.trim();
    address = a.length > 0 ? a.slice(0, 500) : null;
  }

  return {
    ok: true,
    payload: {
      board_type,
      title,
      content,
      image_urls,
      lat,
      lng,
      address,
    },
  };
}
