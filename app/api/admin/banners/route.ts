import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

type Body = {
  id?: string;
  title?: string;
  subtitle?: string | null;
  cta?: string | null;
  href?: string | null;
  is_active?: boolean;
};

function allowedActor(email: string | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const list = parseAdminAllowedEmails();
  if (list.length === 0) return true;
  return list.includes(e);
}

export async function POST(req: Request) {
  const supabaseAuth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!allowedActor(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'JSON 필요' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
  if (typeof body.is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active(boolean) 필요' }, { status: 400 });
  }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'title 필요' }, { status: 400 });
  }
  if (title.length > 12) {
    return NextResponse.json({ error: 'title은 최대 12자입니다.' }, { status: 400 });
  }
  const subtitle =
    body.subtitle === undefined || body.subtitle === null ? null : String(body.subtitle).trim() || null;
  if (subtitle && subtitle.length > 22) {
    return NextResponse.json({ error: 'subtitle은 최대 22자입니다.' }, { status: 400 });
  }
  const cta = body.cta === undefined || body.cta === null ? null : String(body.cta).trim() || null;
  if (cta && cta.length > 22) {
    return NextResponse.json({ error: 'cta는 최대 22자입니다.' }, { status: 400 });
  }
  const href =
    body.href === undefined || body.href === null ? null : String(body.href).trim() || null;

  const admin = createServiceRoleClient();
  const { data: existing } = await admin.from('premium_banners').select('extra').eq('id', id).maybeSingle();
  const currentExtra =
    existing?.extra && typeof existing.extra === 'object' && !Array.isArray(existing.extra)
      ? (existing.extra as Record<string, unknown>)
      : {};
  const nextExtra = { ...currentExtra };
  if (cta) nextExtra.cta = cta;
  else delete nextExtra.cta;
  const { error } = await admin
    .from('premium_banners')
    .update({
      title,
      subtitle,
      href,
      extra: nextExtra,
      is_active: body.is_active,
    })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath('/', 'layout');
  revalidatePath('/admin/banners');
  revalidatePath('/admin/premium-banners');
  return NextResponse.json({ ok: true });
}
