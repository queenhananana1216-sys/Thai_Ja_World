/**
 * 한인 생활망 마스터 CRUD — 서비스 롤 + 관리자 게이트.
 * PATCH 성공 후 항상 `probeAndPersistKoreanBizContacts` 로 연락 인증 뱃지 갱신.
 */
import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import type { KoreanBizCategory } from '@/lib/korean-biz/koreanBizTypes';
import { probeAndPersistKoreanBizContacts } from '@/lib/korean-biz/probeKoreanBizContactUrls';
import { preservePhoneFromPlaces } from '@/lib/korean-biz/publicContact';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SELECT_EXTENDED =
  'id, google_place_id, name, category, region, address, phone, latitude, longitude, is_verified, last_verified_at, line_url, whatsapp_url, contact_checked_at, contact_link_ok';

const CATEGORIES: KoreanBizCategory[] = [
  'mart',
  'pharmacy',
  'hospital',
  'vehicle_rent',
  'golf',
  'massage_spa',
];

const REGIONS = ['bangkok', 'pattaya', 'chiangmai'] as const;

function isCategory(v: unknown): v is KoreanBizCategory {
  return typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v);
}

function isRegion(v: unknown): v is (typeof REGIONS)[number] {
  return typeof v === 'string' && (REGIONS as readonly string[]).includes(v);
}

export async function GET(): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('korean_businesses')
    .select(SELECT_EXTENDED)
    .order('name', { ascending: true })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (typeof o.name === 'string' && o.name.trim()) patch.name = o.name.trim();
  if (typeof o.address === 'string') patch.address = o.address.trim() || null;
  if (o.phone === null) patch.phone = null;
  else if (typeof o.phone === 'string') patch.phone = preservePhoneFromPlaces(o.phone.trim()) ?? o.phone.trim();
  if (typeof o.line_url === 'string') patch.line_url = o.line_url.trim() || null;
  else if (o.line_url === null) patch.line_url = null;
  if (typeof o.whatsapp_url === 'string') patch.whatsapp_url = o.whatsapp_url.trim() || null;
  else if (o.whatsapp_url === null) patch.whatsapp_url = null;
  if (isCategory(o.category)) patch.category = o.category;
  if (isRegion(o.region)) patch.region = o.region;
  if (typeof o.latitude === 'number' && Number.isFinite(o.latitude)) patch.latitude = o.latitude;
  if (typeof o.longitude === 'number' && Number.isFinite(o.longitude)) patch.longitude = o.longitude;
  if (typeof o.is_verified === 'boolean') patch.is_verified = o.is_verified;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 });
  }

  const sb = createServiceRoleClient();
  const { error } = await sb.from('korean_businesses').update(patch).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await probeAndPersistKoreanBizContacts(id);

  return NextResponse.json({ ok: true, probed: true });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const id =
    typeof (body as { id?: unknown }).id === 'string' ? String((body as { id: string }).id).trim() : '';
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const sb = createServiceRoleClient();
  const { error } = await sb.from('korean_businesses').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const o = body as Record<string, unknown>;

  const google_place_id = typeof o.google_place_id === 'string' ? o.google_place_id.trim() : '';
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!google_place_id || !name) {
    return NextResponse.json({ error: 'google_place_id_and_name_required' }, { status: 400 });
  }
  if (!isCategory(o.category)) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
  }
  if (!isRegion(o.region)) {
    return NextResponse.json({ error: 'invalid_region' }, { status: 400 });
  }

  const row = {
    google_place_id,
    name,
    category: o.category as KoreanBizCategory,
    region: o.region,
    address: typeof o.address === 'string' ? o.address.trim() || null : null,
    phone:
      o.phone === null
        ? null
        : typeof o.phone === 'string'
          ? preservePhoneFromPlaces(o.phone.trim()) ?? o.phone.trim()
          : null,
    latitude: typeof o.latitude === 'number' && Number.isFinite(o.latitude) ? o.latitude : null,
    longitude: typeof o.longitude === 'number' && Number.isFinite(o.longitude) ? o.longitude : null,
    line_url: typeof o.line_url === 'string' ? o.line_url.trim() || null : null,
    whatsapp_url: typeof o.whatsapp_url === 'string' ? o.whatsapp_url.trim() || null : null,
    is_verified: typeof o.is_verified === 'boolean' ? o.is_verified : true,
    last_verified_at: new Date().toISOString(),
  };

  const sb = createServiceRoleClient();
  const { data: created, error } = await sb
    .from('korean_businesses')
    .insert(row)
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const newId = (created as { id?: string })?.id;
  if (!newId) {
    return NextResponse.json({ error: 'insert_no_id' }, { status: 500 });
  }

  await probeAndPersistKoreanBizContacts(newId);

  return NextResponse.json({ ok: true, id: newId });
}
