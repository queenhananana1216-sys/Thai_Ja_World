/**
 * 꿀팁·지식 초안 일괄 승인 — DB에 저장된 clean_body 그대로 게시(필드 패치 없음).
 * POST { "scope": "tips_board" | "all" } 또는 { "ids": ["uuid", ...] } (최대 80건)
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
  const authorId = user?.id as string;
  if (!authorId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  let body: { scope?: string; ids?: string[] };
  try {
    body = (await req.json()) as { scope?: string; ids?: string[] };
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  let idList: string[] = [];
  if (Array.isArray(body.ids) && body.ids.length > 0) {
    idList = body.ids.map((x) => String(x).trim()).filter(Boolean).slice(0, 80);
  } else {
    const scope = body.scope === 'all' ? 'all' : 'tips_board';
    let q = admin
      .from('processed_knowledge')
      .select('id, clean_body, board_target')
      .eq('published', false)
      .limit(120);
    const { data: rows, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    for (const r of rows ?? []) {
      if (scope === 'tips_board') {
        const bt = String(r.board_target ?? '');
        const llmBt = (() => {
          try {
            const c = r.clean_body;
            const o = typeof c === 'string' ? JSON.parse(c) : c;
            return typeof o?.board_target === 'string' ? o.board_target : '';
          } catch {
            return '';
          }
        })();
        const effective = llmBt || bt;
        if (effective !== 'tips_board') continue;
      }
      idList.push(String(r.id));
    }
    idList = idList.slice(0, 80);
  }

  if (idList.length === 0) {
    return NextResponse.json({ ok: true, succeeded: 0, failed: 0, results: [], message: '처리할 초안이 없습니다.' });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const id of idList) {
    const { data: row, error: fetchErr } = await admin
      .from('processed_knowledge')
      .select('id, clean_body, published, raw_knowledge_id, post_id, board_target, raw_knowledge(external_url)')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !row) {
      results.push({ id, ok: false, error: 'not_found' });
      continue;
    }
    const pr = row as unknown as ProcessedKnowledgeRow;
    if (pr.published) {
      results.push({ id, ok: false, error: 'already_published' });
      continue;
    }

    const result = await executeKnowledgePublishOrDraft(admin, {
      row: pr,
      authorId,
      action: 'publish',
      fieldPatch: {},
      skipRevalidate: true,
    });

    if (!result.ok) {
      results.push({ id, ok: false, error: result.error });
    } else {
      results.push({ id, ok: true });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;

  if (succeeded > 0) {
    revalidatePath('/community/boards', 'layout');
    revalidatePath('/tips', 'layout');
  }

  return NextResponse.json({
    ok: true,
    succeeded,
    failed,
    results,
  });
}
