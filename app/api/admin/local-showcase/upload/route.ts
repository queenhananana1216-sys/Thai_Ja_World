import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ASSET_TYPES = new Set(['menu_board', 'price_list', 'shop_scene']);

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

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'multipart/form-data 요청 필요' }, { status: 400 });
  const localSpotId = String(form.get('localSpotId') ?? '').trim();
  const assetTypeRaw = String(form.get('assetType') ?? 'menu_board').trim();
  const assetType = ASSET_TYPES.has(assetTypeRaw) ? assetTypeRaw : 'menu_board';
  const file = form.get('file');
  if (!localSpotId || !(file instanceof Blob)) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: '이미지 형식은 jpg/png/webp만 지원' }, { status: 400 });

  const admin = createServiceRoleClient();
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `admin-showcase/${localSpotId}/${randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from('local-spots')
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: pub } = admin.storage.from('local-spots').getPublicUrl(storagePath);
  const { data: row, error: insertError } = await admin
    .from('local_spot_menu_assets')
    .insert({
      local_spot_id: localSpotId,
      asset_type: assetType,
      storage_path: storagePath,
      public_url: pub.publicUrl,
      status: 'uploaded',
      uploaded_by: user?.id ?? null,
    })
    .select('id, public_url, asset_type, created_at')
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ ok: true, asset: row });
}
