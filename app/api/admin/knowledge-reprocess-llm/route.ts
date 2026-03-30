/**
 * 승인 대기 지식 초안: 원문 URL에서 본문을 다시 가져와 LLM으로 초안 재생성 (관리자 전용)
 */
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { reprocessKnowledgeDraftWithLlm } from '@/bots/actions/processAndPersistKnowledge';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
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
    return NextResponse.json(
      { error: '권한이 없습니다. 관리자 이메일로 로그인했는지 확인하세요.' },
      { status: 403 },
    );
  }

  let body: { processed_knowledge_id?: string };
  try {
    body = (await req.json()) as { processed_knowledge_id?: string };
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const id = typeof body.processed_knowledge_id === 'string' ? body.processed_knowledge_id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'processed_knowledge_id 가 필요합니다.' }, { status: 400 });
  }

  const r = await reprocessKnowledgeDraftWithLlm(id);
  if (!r.ok) {
    const status = r.error?.includes('찾을 수 없') ? 404 : 400;
    return NextResponse.json(r, { status });
  }

  revalidatePath('/admin/knowledge');
  return NextResponse.json(r);
}
