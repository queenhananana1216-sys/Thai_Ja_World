/**
 * 긴급 연락처 CRUD — 인가된 관리자만 (이메일 화이트리스트 패턴 = premium-banners)
 */
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

const KINDS = new Set([
  'embassy',
  'police',
  'medical',
  'tourist_police',
  'korean_24h',
  'report',
  'other',
]);
const V_KINDS = new Set(['phone', 'url', 'text']);

type Body = {
  action: 'list' | 'create' | 'update' | 'delete';
  id?: string;
  kind?: string;
  label_ko?: string;
  label_th?: string;
  value?: string;
  value_kind?: string;
  source_url?: string | null;
  source_note?: string | null;
  href?: string | null;
  display_order?: number;
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

  const admin = createServiceRoleClient();

  if (body.action === 'list') {
    const { data, error } = await admin
      .from('community_safety_contacts')
      .select(
        'id, kind, label_ko, label_th, value, value_kind, source_url, source_note, href, display_order, is_active, updated_at',
      )
      .order('display_order', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] });
  }

  if (body.action === 'delete') {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
    const { error } = await admin.from('community_safety_contacts').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/', 'layout');
    revalidatePath('/help/emergency');
    return NextResponse.json({ ok: true });
  }

  const kind = typeof body.kind === 'string' && KINDS.has(body.kind) ? body.kind : 'other';
  const labelKo = typeof body.label_ko === 'string' ? body.label_ko.trim() : '';
  const labelTh = typeof body.label_th === 'string' ? body.label_th.trim() : '';
  const value = typeof body.value === 'string' ? body.value.trim() : '';
  if (!labelKo || !labelTh || !value) {
    return NextResponse.json({ error: 'label_ko, label_th, value 필수' }, { status: 400 });
  }
  const valueKind =
    typeof body.value_kind === 'string' && V_KINDS.has(body.value_kind) ? body.value_kind : 'text';
  const displayOrder =
    typeof body.display_order === 'number' && Number.isFinite(body.display_order)
      ? Math.floor(body.display_order)
      : 0;
  const isActive = typeof body.is_active === 'boolean' ? body.is_active : true;
  const sourceUrl = body.source_url === null ? null : (body.source_url as string | undefined)?.trim() || null;
  const sourceNote = body.source_note === null ? null : (body.source_note as string | undefined)?.trim() || null;
  const href = body.href === null ? null : (body.href as string | undefined)?.trim() || null;

  if (body.action === 'create') {
    const { data, error } = await admin
      .from('community_safety_contacts')
      .insert({
        kind,
        label_ko: labelKo,
        label_th: labelTh,
        value,
        value_kind: valueKind,
        source_url: sourceUrl,
        source_note: sourceNote,
        href,
        display_order: displayOrder,
        is_active: isActive,
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/', 'layout');
    revalidatePath('/help/emergency');
    return NextResponse.json({ ok: true, id: data?.id });
  }

  if (body.action === 'update') {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
    const { error } = await admin
      .from('community_safety_contacts')
      .update({
        kind,
        label_ko: labelKo,
        label_th: labelTh,
        value,
        value_kind: valueKind,
        source_url: sourceUrl,
        source_note: sourceNote,
        href,
        display_order: displayOrder,
        is_active: isActive,
      })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/', 'layout');
    revalidatePath('/help/emergency');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'action 은 list | create | update | delete' }, { status: 400 });
}
