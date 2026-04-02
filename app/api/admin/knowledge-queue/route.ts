/**
 * 관리자 지식 컨텐츠 초안 편집·게시·삭제
 *
 * action: publish | draft | delete
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import {
  executeKnowledgePublishOrDraft,
  type ProcessedKnowledgeRow,
} from '@/lib/knowledge/knowledgeQueuePublishCore';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

type Body = {
  processed_knowledge_id?: string;
  action?: 'publish' | 'draft' | 'delete';
  ko_title?: string;
  ko_summary?: string;
  ko_editorial_note?: string;
  th_title?: string;
  th_summary?: string;
  th_editorial_note?: string;
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

  const id = typeof body.processed_knowledge_id === 'string' ? body.processed_knowledge_id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'processed_knowledge_id 가 필요합니다.' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  const { data: row, error: fetchErr } = await admin
    .from('processed_knowledge')
    .select('id, clean_body, published, raw_knowledge_id, post_id, board_target, raw_knowledge(external_url)')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json(
      { error: fetchErr?.message ?? '해당 지식 초안을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  const processedRow = row as unknown as ProcessedKnowledgeRow;

  if (body.action === 'delete') {
    const rawId = processedRow.raw_knowledge_id as string;
    if (processedRow.post_id) {
      await admin.from('posts').delete().eq('id', processedRow.post_id as string);
    }
    const { error: delErr } = await admin.from('raw_knowledge').delete().eq('id', rawId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    revalidatePath('/community/boards', 'layout');
    revalidatePath('/tips', 'layout');
    return NextResponse.json({ ok: true, deleted: true });
  }

  const action = body.action === 'draft' ? 'draft' : 'publish';
  const authorId = user?.id as string;
  if (!authorId) {
    return NextResponse.json({ error: '로그인 사용자 id 가 없습니다.' }, { status: 401 });
  }

  const result = await executeKnowledgePublishOrDraft(admin, {
    row: processedRow,
    authorId,
    action,
    fieldPatch: {
      ko_title: body.ko_title,
      ko_summary: body.ko_summary,
      ko_editorial_note: body.ko_editorial_note,
      th_title: body.th_title,
      th_summary: body.th_summary,
      th_editorial_note: body.th_editorial_note,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, published: result.published });
}
