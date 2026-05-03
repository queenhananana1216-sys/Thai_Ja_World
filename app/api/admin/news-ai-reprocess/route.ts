/**
 * 관리자: 단일 뉴스 초안에 대해 원문 기준 한국어 전용 LLM 재가공 → 승인 대기(published=false) 고정
 */
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { adminReprocessProcessedNewsKoreanOnly } from '@/bots/actions/summarizeAndPersistNews';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

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

  let body: { processed_news_id?: string };
  try {
    body = (await req.json()) as { processed_news_id?: string };
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const id = typeof body.processed_news_id === 'string' ? body.processed_news_id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'processed_news_id 가 필요합니다.' }, { status: 400 });
  }

  const result = await adminReprocessProcessedNewsKoreanOnly(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? '재가공 실패' }, { status: 400 });
  }

  revalidatePath('/admin/news');
  revalidatePath('/', 'layout');
  revalidatePath('/news');
  revalidatePath(`/news/${id}`);

  return NextResponse.json({ ok: true });
}
