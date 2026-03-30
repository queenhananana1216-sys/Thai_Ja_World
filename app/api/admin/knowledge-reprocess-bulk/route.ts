/**
 * 미게시(published=false) 지식 초안을 N건씩 LLM 재가공 — 태자 편집 프롬프트·제미나이 등 현재 서버 설정 적용.
 * 게시 완료 글은 건드리지 않음. Vercel 타임아웃을 피하려 한 요청당 최대 10건; UI에서 연속 호출로 전체 처리.
 */
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import {
  isKnowledgeLlmConfigured,
  reprocessUnpublishedKnowledgeDraftsBatch,
} from '@/bots/actions/processAndPersistKnowledge';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const maxDuration = 300;

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

  if (!isKnowledgeLlmConfigured()) {
    return NextResponse.json(
      {
        error:
          'LLM 키가 서버에 없습니다. GEMINI_API_KEY(또는 OPENAI_API_KEY)를 Vercel·로컬 .env.local에 넣은 뒤 재배포하세요.',
      },
      { status: 400 },
    );
  }

  let maxItems = 5;
  try {
    const body = (await req.json()) as { max_items?: number };
    if (typeof body.max_items === 'number' && Number.isFinite(body.max_items)) {
      maxItems = Math.min(10, Math.max(1, Math.floor(body.max_items)));
    }
  } catch {
    maxItems = 5;
  }

  const result = await reprocessUnpublishedKnowledgeDraftsBatch(maxItems);

  revalidatePath('/admin/knowledge');
  revalidatePath('/tips', 'layout');

  return NextResponse.json(result);
}
