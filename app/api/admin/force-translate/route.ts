/**
 * 한글 가공이 끝나지 않은 `processed_news` 를 `raw_news` 기준으로 LLM 재가공(백필).
 */
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { forceTranslateIncompleteProcessedNews } from '@/bots/actions/summarizeAndPersistNews';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

const MAX_LIMIT = 80;
const DEFAULT_LIMIT = 40;

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

  const r = await forceTranslateIncompleteProcessedNews(limit);
  if (!r.llmConfigured) {
    return NextResponse.json(
      {
        ...r,
        message:
          'NEWS 요약용 LLM 이 설정되어 있지 않습니다. OPENAI_API_KEY·GEMINI_API_KEY 또는 로컬 OPENAI 호환 URL 을 설정하세요.',
      },
      { status: 503 },
    );
  }

  revalidatePath('/');
  revalidatePath('/news');
  return NextResponse.json(r);
}
