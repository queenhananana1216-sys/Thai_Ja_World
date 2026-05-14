import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import {
  normalizeThailandPhoneForDisplay,
  preservePhoneFromPlaces,
} from '@/lib/korean-biz/publicContact';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SELECT = 'id, slug, name, category, region, phone, address, map_url, is_active, updated_at';

function normalizeMapUrl(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (!/^https:\/\//i.test(s)) return null;
  const lower = s.toLowerCase();
  if (lower.includes('google.') && lower.includes('/maps')) return s;
  if (lower.includes('maps.google.')) return s;
  return null;
}

export async function GET(): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('local_businesses')
    .select(SELECT)
    .order('updated_at', { ascending: false })
    .limit(400);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

  if (typeof o.address === 'string') patch.address = o.address.trim() || null;
  else if (o.address === null) patch.address = null;

  if (o.phone === null) patch.phone = null;
  else if (typeof o.phone === 'string') {
    const raw = o.phone.trim();
    patch.phone = normalizeThailandPhoneForDisplay(raw) ?? preservePhoneFromPlaces(raw) ?? (raw || null);
  }

  if (typeof o.map_url === 'string') {
    const m = normalizeMapUrl(o.map_url);
    patch.map_url = m;
    if (o.map_url.trim() && !m) {
      return NextResponse.json({ error: 'map_url_must_be_https_google_maps' }, { status: 400 });
    }
  } else if (o.map_url === null) {
    patch.map_url = null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 });
  }

  const sb = createServiceRoleClient();
  const { error } = await sb.from('local_businesses').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
