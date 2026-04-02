import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

function allowedActor(email: string | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const list = parseAdminAllowedEmails();
  if (list.length === 0) return true;
  return list.includes(e);
}

export async function POST() {
  const supabaseAuth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!allowedActor(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin.from('local_spots').select('id').eq('is_published', false).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (rows ?? []).map((r) => String(r.id));
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, message: '승인 대기 로컬이 없습니다.' });
  }

  const { error: upErr } = await admin.from('local_spots').update({ is_published: true }).in('id', ids);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  revalidatePath('/admin/local-spots');
  revalidatePath('/local');
  revalidatePath('/shop', 'layout');
  return NextResponse.json({ ok: true, updated: ids.length });
}
