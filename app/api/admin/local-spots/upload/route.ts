/**
 * 로컬 가게 이미지 업로드 → local-spots 버킷 공개 URL 반환 (service role)
 */

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;

function allowedActor(email: string | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const list = parseAdminAllowedEmails();
  if (list.length === 0) return true;
  return list.includes(e);
}

function extFromType(ct: string): string {
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  return 'bin';
}

export async function POST(req: Request) {
  const supabaseAuth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!allowedActor(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'multipart 필요' }, { status: 400 });
  }

  const rawFiles = form.getAll('file');
  const blobs: Blob[] = [];
  for (const x of rawFiles) {
    if (typeof x === 'string') continue;
    if (x instanceof Blob) blobs.push(x);
  }
  if (!blobs.length) {
    return NextResponse.json({ error: 'file 필드에 이미지를 넣어 주세요.' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const urls: string[] = [];

  for (const file of blobs) {
    const ct = file.type || 'application/octet-stream';
    if (!ALLOWED.has(ct)) {
      return NextResponse.json({ error: `허용되지 않는 형식: ${ct}` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: '파일당 최대 5MB' }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const path = `spots/${randomUUID()}.${extFromType(ct)}`;
    const { error: upErr } = await admin.storage.from('local-spots').upload(path, buf, {
      contentType: ct,
      upsert: false,
    });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
    const { data: pub } = admin.storage.from('local-spots').getPublicUrl(path);
    if (pub?.publicUrl) urls.push(pub.publicUrl);
  }

  return NextResponse.json({ ok: true, urls });
}
