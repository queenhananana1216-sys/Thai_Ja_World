/**
 * 관리자 뉴스 초안 편집·게시 (세션 쿠키 + ADMIN_ALLOWED_EMAILS 규칙과 /admin 레이아웃 동일)
 */
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { mergeBilingualCleanBody } from '@/lib/news/mergeCleanBody';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

type Body = {
  processed_news_id?: string;
  action?: 'publish' | 'draft';
  ko_title?: string;
  ko_summary?: string;
  th_title?: string;
  th_summary?: string;
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = typeof body.processed_news_id === 'string' ? body.processed_news_id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'processed_news_id required' }, { status: 400 });
  }

  const action = body.action === 'draft' ? 'draft' : 'publish';
  const admin = createServiceRoleClient();

  const { data: row, error: fetchErr } = await admin
    .from('processed_news')
    .select('id, clean_body')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: fetchErr?.message ?? 'Not found' }, { status: 404 });
  }

  const nextBody = mergeBilingualCleanBody(row.clean_body as string | null, {
    ko_title: body.ko_title,
    ko_summary: body.ko_summary,
    th_title: body.th_title,
    th_summary: body.th_summary,
  });

  const { error: upErr } = await admin
    .from('processed_news')
    .update({
      clean_body: nextBody,
      published: action === 'publish',
    })
    .eq('id', id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  if (body.ko_summary?.trim()) {
    await admin.from('summaries').update({ summary_text: body.ko_summary.trim() }).eq('processed_news_id', id).eq('model', 'ko');
  }
  if (body.th_summary?.trim()) {
    await admin.from('summaries').update({ summary_text: body.th_summary.trim() }).eq('processed_news_id', id).eq('model', 'th');
  }

  return NextResponse.json({ ok: true, published: action === 'publish' });
}
