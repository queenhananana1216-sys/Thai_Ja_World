/**
 * 미게시 뉴스 초안 단건을 LLM 으로 재가공합니다 (관리자 전용).
 * Body: { "processed_news_id": "<uuid>" }
 */
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { reprocessNewsStubWithLlm } from '@/bots/actions/summarizeAndPersistNews';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const maxDuration = 120;

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
    return NextResponse.json(
      { error: '권한이 없습니다. 관리자 이메일로 로그인했는지 확인하세요.' },
      { status: 403 },
    );
  }

  let body: { processed_news_id?: string };
  try {
    body = (await req.json()) as { processed_news_id?: string };
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const id =
    typeof body.processed_news_id === 'string' ? body.processed_news_id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'processed_news_id 가 필요합니다.' }, { status: 400 });
  }

  const r = await reprocessNewsStubWithLlm(id);
  if (!r.ok) {
    const status = r.error?.includes('찾을 수 없') ? 404 : 400;
    return NextResponse.json(r, { status });
  }

  revalidatePath('/admin/news');
  return NextResponse.json(r);
}
