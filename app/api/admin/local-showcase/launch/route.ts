import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function isAllowed(email?: string) {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const allowed = parseAdminAllowedEmails();
  if (allowed.length === 0) return true;
  return allowed.includes(e);
}

export async function POST(req: Request) {
  const auth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!isAllowed(user?.email)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { draftId?: string } | null;
  const draftId = String(body?.draftId ?? '').trim();
  if (!draftId) return NextResponse.json({ error: 'draftId가 필요합니다.' }, { status: 400 });

  const admin = createServiceRoleClient();
  const { data: draft, error } = await admin
    .from('local_spot_template_drafts')
    .select('id, local_spot_id, template_json, local_spots(id, name, category, region, owner_profile_id, photo_urls)')
    .eq('id', draftId)
    .maybeSingle();
  if (error || !draft) return NextResponse.json({ error: error?.message ?? 'draft_not_found' }, { status: 404 });

  const spot = Array.isArray(draft.local_spots) ? draft.local_spots[0] : draft.local_spots;
  if (!spot) return NextResponse.json({ error: 'spot_not_found' }, { status: 404 });

  const slug = `${slugify(String(spot.name ?? 'local-shop'))}-${Date.now().toString().slice(-6)}`;
  const payload = {
    name: String(spot.name ?? '로컬 매장'),
    slug,
    category: String(spot.category ?? 'service'),
    region: String((spot as { region?: string }).region ?? 'bangkok'),
    owner_id: String((spot as { owner_profile_id?: string }).owner_profile_id ?? ''),
    image_urls: Array.isArray((spot as { photo_urls?: unknown }).photo_urls)
      ? ((spot as { photo_urls: string[] }).photo_urls ?? [])
      : [],
    mini_home: draft.template_json,
  };

  const { data: business, error: insertError } = await admin
    .from('local_businesses')
    .insert(payload)
    .select('id, name, slug')
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await admin.from('local_spot_template_drafts').update({ status: 'applied' }).eq('id', draftId);
  return NextResponse.json({ ok: true, business });
}
