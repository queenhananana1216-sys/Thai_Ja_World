import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 8 * 1024 * 1024;
const ASSET_TYPES = new Set(['menu_board', 'price_list', 'treatment_sheet', 'shop_scene']);

function extFromType(ct: string): string {
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  return 'bin';
}

async function resolveActorAndSpot(spotId: string): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }
> {
  const auth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user?.id) return { ok: false, status: 401, error: '로그인이 필요합니다.' };

  const admin = createServiceRoleClient();
  const { data: owned, error } = await admin
    .from('local_spots')
    .select('id')
    .eq('id', spotId)
    .eq('owner_profile_id', user.id)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: error.message };
  if (!owned) return { ok: false, status: 403, error: '해당 가게의 수정 권한이 없습니다.' };
  return { ok: true, userId: user.id };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const spotId = String(id ?? '').trim();
  if (!spotId) return NextResponse.json({ error: '가게 id가 필요합니다.' }, { status: 400 });

  const actor = await resolveActorAndSpot(spotId);
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  const admin = createServiceRoleClient();
  const [assetsRes, draftsRes] = await Promise.all([
    admin
      .from('local_spot_menu_assets')
      .select('id, asset_type, public_url, status, error_message, created_at, processed_at, pipeline_meta')
      .eq('local_spot_id', spotId)
      .order('created_at', { ascending: false })
      .limit(30),
    admin
      .from('local_spot_template_drafts')
      .select('id, confidence, status, review_note, created_at, approved_at, applied_at, template_json, pipeline_meta')
      .eq('local_spot_id', spotId)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  if (assetsRes.error) {
    return NextResponse.json({ error: assetsRes.error.message }, { status: 500 });
  }
  if (draftsRes.error) {
    return NextResponse.json({ error: draftsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    assets: assetsRes.data ?? [],
    drafts: draftsRes.data ?? [],
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const spotId = String(id ?? '').trim();
  if (!spotId) return NextResponse.json({ error: '가게 id가 필요합니다.' }, { status: 400 });

  const actor = await resolveActorAndSpot(spotId);
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'multipart/form-data 요청이 필요합니다.' }, { status: 400 });
  }

  const typeRaw = String(form.get('asset_type') ?? 'menu_board').trim();
  const assetType = ASSET_TYPES.has(typeRaw) ? typeRaw : 'menu_board';
  const rawFiles = form.getAll('file');
  const blobs: Blob[] = [];
  for (const item of rawFiles) {
    if (typeof item === 'string') continue;
    if (item instanceof Blob) blobs.push(item);
  }
  if (blobs.length === 0) {
    return NextResponse.json({ error: '업로드할 이미지 파일이 없습니다.' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const inserted: Array<Record<string, unknown>> = [];

  for (const file of blobs) {
    const ct = file.type || 'application/octet-stream';
    if (!ALLOWED.has(ct)) {
      return NextResponse.json({ error: `지원하지 않는 이미지 형식: ${ct}` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: '파일당 최대 8MB까지 업로드할 수 있습니다.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${actor.userId}/shops/${spotId}/menu-assets/${randomUUID()}.${extFromType(ct)}`;
    const { error: upErr } = await admin.storage.from('local-spots').upload(path, buffer, {
      contentType: ct,
      upsert: false,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data: pub } = admin.storage.from('local-spots').getPublicUrl(path);
    const publicUrl = pub?.publicUrl ?? '';
    const { data: row, error: insErr } = await admin
      .from('local_spot_menu_assets')
      .insert({
        local_spot_id: spotId,
        asset_type: assetType,
        storage_path: path,
        public_url: publicUrl,
        status: 'uploaded',
        uploaded_by: actor.userId,
      })
      .select('id, asset_type, public_url, status, created_at')
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    inserted.push(row as Record<string, unknown>);
  }

  return NextResponse.json({ ok: true, assets: inserted });
}
