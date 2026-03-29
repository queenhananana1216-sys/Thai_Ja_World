/**
 * 최근 공개(processed_news.published=true) N건을 초안(false)으로 되돌려 뉴스 승인 큐에 올림.
 * 예전 NEWS_PUBLISH_MODE=auto 로 쌓인 건을 다시 검토·게시할 때 사용.
 */
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

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

  let body: { limit?: unknown };
  try {
    body = (await req.json()) as { limit?: unknown };
  } catch {
    body = {};
  }
  const raw = Number(body.limit);
  const limit = Number.isFinite(raw)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(raw)))
    : DEFAULT_LIMIT;

  const admin = createServiceRoleClient();
  const { data: rows, error: selErr } = await admin
    .from('processed_news')
    .select('id')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  const ids = (rows ?? []).map((r) => r.id as string).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, message: '공개 중인 processed_news 가 없습니다.' });
  }

  const { error: upErr } = await admin.from('processed_news').update({ published: false }).in('id', ids);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  revalidatePath('/', 'layout');
  revalidatePath('/news');
  for (const id of ids) {
    revalidatePath(`/news/${id}`);
  }

  return NextResponse.json({ ok: true, updated: ids.length });
}
