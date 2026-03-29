/**
 * 프리미엄 배너 CRUD — 관리자 전용 (service role)
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

type Body = {
  action?: 'create' | 'update' | 'delete';
  id?: string;
  slot?: string;
  title?: string;
  subtitle?: string | null;
  image_url?: string | null;
  href?: string | null;
  badge_text?: string | null;
  sort_order?: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  extra_json?: string | null;
};

const SLOTS = ['top_bar', 'home_strip', 'sidebar'] as const;

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

  const action = body.action;
  if (action !== 'create' && action !== 'update' && action !== 'delete') {
    return NextResponse.json({ error: 'action 은 create | update | delete' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  if (action === 'delete') {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
    const { error } = await admin.from('premium_banners').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/', 'layout');
    revalidatePath('/admin/premium-banners');
    return NextResponse.json({ ok: true });
  }

  const slot =
    typeof body.slot === 'string' && (SLOTS as readonly string[]).includes(body.slot) ? body.slot : 'top_bar';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const sort_order =
    typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)
      ? Math.floor(body.sort_order)
      : 0;
  const is_active = body.is_active !== false;
  const subtitle = body.subtitle === undefined || body.subtitle === null ? null : String(body.subtitle);
  const image_url =
    body.image_url === undefined || body.image_url === null ? null : String(body.image_url).trim() || null;
  const href = body.href === undefined || body.href === null ? null : String(body.href).trim() || null;
  const badge_text =
    body.badge_text === undefined || body.badge_text === null ? null : String(body.badge_text).trim() || null;
  const starts_at = body.starts_at?.trim() || null;
  const ends_at = body.ends_at?.trim() || null;

  let extra: Record<string, unknown> = {};
  const ej = body.extra_json?.trim();
  if (ej) {
    try {
      const o = JSON.parse(ej) as unknown;
      if (o && typeof o === 'object' && !Array.isArray(o)) extra = o as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'extra_json 파싱 실패' }, { status: 400 });
    }
  }

  if (action === 'create') {
    const { data: row, error } = await admin
      .from('premium_banners')
      .insert({
        slot,
        title,
        subtitle,
        image_url,
        href,
        badge_text,
        sort_order,
        is_active,
        starts_at,
        ends_at,
        extra,
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/', 'layout');
    revalidatePath('/admin/premium-banners');
    return NextResponse.json({ ok: true, row });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'update 시 id' }, { status: 400 });

  const { error } = await admin
    .from('premium_banners')
    .update({
      slot,
      title,
      subtitle,
      image_url,
      href,
      badge_text,
      sort_order,
      is_active,
      starts_at,
      ends_at,
      extra,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath('/', 'layout');
  revalidatePath('/admin/premium-banners');
  return NextResponse.json({ ok: true });
}
