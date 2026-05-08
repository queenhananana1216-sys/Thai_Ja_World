/**
 * POST JSON { placeOrUrl: string } — Places(New) details 로 한인 업소 초안 필드 반환.
 */
import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { coerceGooglePlaceIdInput } from '@/lib/korean-biz/coerceGooglePlaceId';
import { guessKoreanBizRegionFromAddress } from '@/lib/korean-biz/guessKoreanBizRegion';
import { placesDetails } from '@/lib/korean-biz/bizRadarPlaces';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const raw = typeof (body as { placeOrUrl?: unknown }).placeOrUrl === 'string'
    ? String((body as { placeOrUrl: string }).placeOrUrl)
    : '';
  const placeId = coerceGooglePlaceIdInput(raw);
  if (!placeId) {
    return NextResponse.json({ error: 'place_id_unparsed' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY' }, { status: 503 });
  }

  const data = await placesDetails({ apiKey, placeId });
  if (data.status !== 'OK' || !data.result) {
    return NextResponse.json(
      {
        error: 'place_details_failed',
        detail: data.status === 'REQUEST_DENIED' ? data.error_message ?? data.status : data.status,
      },
      { status: 502 },
    );
  }

  const d = data.result;
  const suggested_region = guessKoreanBizRegionFromAddress(d.formatted_address ?? null);
  const phone = d.formatted_phone_number ?? d.international_phone_number ?? null;
  const coords = d.geometry?.location;

  return NextResponse.json({
    draft: {
      google_place_id: placeId.trim(),
      name: typeof d.name === 'string' && d.name.trim() ? d.name.trim() : '이름 확인 필요',
      address: typeof d.formatted_address === 'string' ? d.formatted_address : null,
      phone: typeof phone === 'string' ? phone.trim() : null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      suggested_region,
      suggested_category: 'mart' as const,
      is_verified: d.business_status ? d.business_status === 'OPERATIONAL' : true,
    },
  });
}
