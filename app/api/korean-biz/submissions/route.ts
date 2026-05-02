import { type NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REGIONS = new Set(['bangkok', 'pattaya', 'chiangmai']);
const CATEGORIES = new Set([
  'mart',
  'pharmacy',
  'hospital',
  'vehicle_rent',
  'golf',
  'massage_spa',
]);

function normalizeBody(raw: unknown): {
  name: string;
  address: string | null;
  phone: string | null;
  suggested_category: string | null;
  suggested_region: string;
  submitter_note: string | null;
  honeypot: string | null;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    name: typeof o.name === 'string' ? o.name : '',
    address: typeof o.address === 'string' ? o.address : '',
    phone: typeof o.phone === 'string' ? o.phone : '',
    suggested_category:
      typeof o.suggested_category === 'string' ? o.suggested_category : '',
    suggested_region: typeof o.suggested_region === 'string' ? o.suggested_region : '',
    submitter_note: typeof o.submitter_note === 'string' ? o.submitter_note : '',
    honeypot: typeof o.website === 'string' ? o.website : null,
  };
}

/**
 * 공개 제보 — rate limit은 엣지/WAF에 위임, 스팸 필드(website)로 봇 완화
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let parsed: ReturnType<typeof normalizeBody>;
  try {
    const json: unknown = await req.json();
    parsed = normalizeBody(json);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!parsed) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (parsed.honeypot && parsed.honeypot.trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const name = parsed.name.trim();
  if (name.length < 2) {
    return NextResponse.json({ error: 'name_too_short' }, { status: 400 });
  }
  if (name.length > 300) {
    return NextResponse.json({ error: 'name_too_long' }, { status: 400 });
  }

  const region = parsed.suggested_region.trim().toLowerCase();
  if (!REGIONS.has(region)) {
    return NextResponse.json({ error: 'invalid_region' }, { status: 400 });
  }

  let category:
    | 'mart'
    | 'pharmacy'
    | 'hospital'
    | 'vehicle_rent'
    | 'golf'
    | 'massage_spa'
    | null = null;
  const catRaw = parsed.suggested_category?.trim().toLowerCase() ?? '';
  if (catRaw && CATEGORIES.has(catRaw)) {
    category = catRaw as NonNullable<typeof category>;
  }

  const address = parsed.address?.trim() || null;
  const phone = parsed.phone?.trim() || null;
  const note = parsed.submitter_note?.trim() || null;
  if (address && address.length > 800) {
    return NextResponse.json({ error: 'address_too_long' }, { status: 400 });
  }
  if (phone && phone.length > 80) {
    return NextResponse.json({ error: 'phone_too_long' }, { status: 400 });
  }
  if (note && note.length > 1000) {
    return NextResponse.json({ error: 'note_too_long' }, { status: 400 });
  }

  let submittedBy: string | null = null;
  try {
    const authSb = await createServerSupabaseAuthClient();
    const {
      data: { user },
    } = await authSb.auth.getUser();
    if (user?.id) submittedBy = user.id;
  } catch {
    /* optional auth */
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('korean_biz_submissions')
    .insert({
      name,
      address,
      phone,
      suggested_category: category,
      suggested_region: region,
      submitter_note: note,
      submitted_by: submittedBy,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[korean-biz/submissions]', error.message);
    return NextResponse.json({ error: 'save_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: (data as { id?: string } | null)?.id ?? null }, { status: 201 });
}
