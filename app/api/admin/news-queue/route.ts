/**
 * 관리자 뉴스 초안 편집·게시·삭제 (세션 쿠키 + ADMIN_ALLOWED_EMAILS 와 /admin 레이아웃 동일)
 *
 * action: publish | draft | delete — delete 는 미게시(published=false) 만, raw_news 삭제로 요약·댓글 cascade
 */
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { mergeBilingualCleanBody } from '@/lib/news/mergeCleanBody';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

type Body = {
  processed_news_id?: string;
  action?: 'publish' | 'draft' | 'delete';
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
    return NextResponse.json({ error: '권한이 없습니다. 관리자 이메일로 로그인했는지 확인하세요.' }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const id = typeof body.processed_news_id === 'string' ? body.processed_news_id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'processed_news_id 가 필요합니다.' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  const { data: row, error: fetchErr } = await admin
    .from('processed_news')
    .select('id, clean_body, published, raw_news_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json(
      { error: fetchErr?.message ?? '해당 뉴스 초안을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  if (body.action === 'delete') {
    if (row.published !== false) {
      return NextResponse.json(
        { error: '이미 홈에 게시된 기사는 여기서 삭제할 수 없습니다. 먼저 비공개 처리가 필요하면 별도 요청이 필요합니다.' },
        { status: 400 },
      );
    }
    const rawId = row.raw_news_id as string;
    const { error: delErr } = await admin.from('raw_news').delete().eq('id', rawId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    revalidatePath('/', 'layout');
    revalidatePath('/news');
    revalidatePath(`/news/${id}`);
    return NextResponse.json({ ok: true, deleted: true });
  }

  const action = body.action === 'draft' ? 'draft' : 'publish';

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

  revalidatePath('/', 'layout');
  revalidatePath('/news');
  revalidatePath(`/news/${id}`);

  return NextResponse.json({ ok: true, published: action === 'publish' });
}
