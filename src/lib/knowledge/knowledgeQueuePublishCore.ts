import 'server-only';

import { revalidatePath } from 'next/cache';
import type { KnowledgeLlmOutput } from '@/lib/knowledge/knowledgeLlmTypes';
import {
  buildPostContent,
  excerptFromKnowledgeKo,
  parseKnowledgeCleanBody,
  validateKnowledgePublish,
} from '@/lib/knowledge/knowledgePostBodyShared';
import { createServiceRoleClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createServiceRoleClient>;

export type KnowledgeFieldPatch = {
  ko_title?: string;
  ko_summary?: string;
  ko_editorial_note?: string;
  th_title?: string;
  th_summary?: string;
  th_editorial_note?: string;
};

export type ProcessedKnowledgeRow = {
  id: string;
  clean_body: unknown;
  published: boolean;
  raw_knowledge_id: string;
  post_id: string | null;
  board_target: string;
  raw_knowledge: { external_url?: string } | null;
};

/** clean_body JSON 에서 ko/th title·summary 만 덮어쓰기 */
export function mergeKnowledgeCleanBody(
  existing: unknown,
  patch: KnowledgeFieldPatch,
  fallbackBoardTarget: 'tips_board' | 'board_board' = 'board_board',
): string {
  let parsed: KnowledgeLlmOutput | null = null;
  try {
    if (typeof existing === 'string') {
      parsed = JSON.parse(existing) as KnowledgeLlmOutput;
    } else if (existing && typeof existing === 'object') {
      parsed = existing as KnowledgeLlmOutput;
    }
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return JSON.stringify({
      board_target: fallbackBoardTarget,
      editorial_meta: {
        novelty_score: 50,
        usefulness_score: 50,
        confidence_level: 'medium' as const,
        reasons: [],
      },
      ko: {
        title: patch.ko_title ?? '',
        summary: patch.ko_summary ?? '',
        editorial_note: (patch.ko_editorial_note ?? '').trim() || undefined,
        checklist: [],
        cautions: [],
        tags: [],
      },
      th: {
        title: patch.th_title ?? '',
        summary: patch.th_summary ?? '',
        editorial_note: (patch.th_editorial_note ?? '').trim() || undefined,
        checklist: [],
        cautions: [],
        tags: [],
      },
      board_copy: { category_badge_text: '', category_description: '' },
      sources: [],
    });
  }

  if (patch.ko_title !== undefined && parsed.ko) parsed.ko.title = patch.ko_title.trim();
  if (patch.ko_summary !== undefined && parsed.ko) parsed.ko.summary = patch.ko_summary.trim();
  if (patch.ko_editorial_note !== undefined && parsed.ko) {
    const t = patch.ko_editorial_note.trim();
    if (t) parsed.ko.editorial_note = t;
    else delete parsed.ko.editorial_note;
  }
  if (patch.th_title !== undefined && parsed.th) parsed.th.title = patch.th_title.trim();
  if (patch.th_summary !== undefined && parsed.th) parsed.th.summary = patch.th_summary.trim();
  if (patch.th_editorial_note !== undefined && parsed.th) {
    const t = patch.th_editorial_note.trim();
    if (t) parsed.th.editorial_note = t;
    else delete parsed.th.editorial_note;
  }

  return JSON.stringify(parsed);
}

export { parseKnowledgeCleanBody, validateKnowledgePublish, buildPostContent } from '@/lib/knowledge/knowledgePostBodyShared';

function boardTargetToPostCategory(boardTarget: 'tips_board' | 'board_board'): string {
  return boardTarget === 'tips_board' ? 'info' : 'free';
}

/**
 * 단일 초안 게시/초안저장. 일괄 승인 시 fieldPatch 를 비우면 DB clean_body 그대로 게시(제미나이·편집 반영분).
 */
export async function executeKnowledgePublishOrDraft(
  admin: AdminClient,
  params: {
    row: ProcessedKnowledgeRow;
    authorId: string;
    action: 'publish' | 'draft';
    fieldPatch: KnowledgeFieldPatch;
    /** 일괄 승인 시 true — 호출 측에서 마지막에 revalidatePath 일괄 처리 */
    skipRevalidate?: boolean;
  },
): Promise<{ ok: true; published: boolean } | { ok: false; error: string; status: number }> {
  const { row, authorId, action, fieldPatch, skipRevalidate } = params;
  const id = row.id;
  const willPublish = action === 'publish';
  const moderationStatus = willPublish ? 'safe' : 'hidden';

  const fallbackBt =
    row.board_target === 'tips_board' || row.board_target === 'board_board'
      ? row.board_target
      : 'board_board';
  const nextBody = mergeKnowledgeCleanBody(row.clean_body, fieldPatch, fallbackBt);
  const llm = parseKnowledgeCleanBody(nextBody);
  if (!llm?.ko) {
    return { ok: false, error: 'clean_body 를 파싱할 수 없습니다.', status: 400 };
  }

  const koSum = llm.ko.summary?.trim() ?? '';
  const koEd = llm.ko.editorial_note?.trim() ?? '';

  if (willPublish) {
    const pubErr = validateKnowledgePublish(koSum, koEd);
    if (pubErr) {
      return { ok: false, error: pubErr, status: 400 };
    }
  }

  const { error: upErr } = await admin
    .from('processed_knowledge')
    .update({ clean_body: nextBody, published: willPublish })
    .eq('id', id);

  if (upErr) {
    return { ok: false, error: upErr.message, status: 500 };
  }

  const boardTarget = (llm.board_target ?? row.board_target) as 'tips_board' | 'board_board';
  const category = boardTargetToPostCategory(boardTarget);
  const rawExternalUrl = row.raw_knowledge?.external_url ?? undefined;

  const postTitle = llm.ko.title?.trim() || '(제목 없음)';
  const postContent = buildPostContent(llm, rawExternalUrl);
  const postExcerpt = excerptFromKnowledgeKo({ summary: koSum, editorial_note: koEd || undefined });

  let boardPostIdForRevalidate: string | null = row.post_id ? String(row.post_id) : null;

  if (willPublish || row.post_id) {
    let nextPostId: string | null = row.post_id ? String(row.post_id) : null;

    if (nextPostId) {
      const { error: pUpErr } = await admin
        .from('posts')
        .update({
          title: postTitle.slice(0, 200),
          content: postContent,
          category,
          moderation_status: moderationStatus,
          excerpt: postExcerpt || null,
          is_knowledge_tip: true,
        })
        .eq('id', nextPostId);
      if (pUpErr) {
        return { ok: false, error: pUpErr.message, status: 500 };
      }
    } else if (willPublish) {
      const { data: ins, error: pInsErr } = await admin
        .from('posts')
        .insert({
          author_id: authorId,
          plaza_id: null,
          category,
          title: postTitle.slice(0, 200),
          content: postContent,
          image_urls: [],
          is_anonymous: false,
          moderation_status: moderationStatus,
          excerpt: postExcerpt || null,
          is_knowledge_tip: true,
        })
        .select('id')
        .single();

      if (pInsErr || !ins?.id) {
        return { ok: false, error: pInsErr?.message ?? 'posts insert 실패', status: 500 };
      }
      nextPostId = String(ins.id);

      const { error: pkErr } = await admin.from('processed_knowledge').update({ post_id: nextPostId }).eq('id', id);
      if (pkErr) {
        return { ok: false, error: pkErr.message, status: 500 };
      }
    }
    boardPostIdForRevalidate = nextPostId;
  }

  const koSummarySync = [llm.ko.summary?.trim(), llm.ko.editorial_note?.trim()].filter(Boolean).join('\n\n').trim();
  if (koSummarySync) {
    await admin
      .from('knowledge_summaries')
      .update({ summary_text: koSummarySync })
      .eq('processed_knowledge_id', id)
      .eq('model', 'ko');
  }
  const thSummarySync = [llm.th?.summary?.trim(), llm.th?.editorial_note?.trim()].filter(Boolean).join('\n\n').trim();
  if (thSummarySync) {
    await admin
      .from('knowledge_summaries')
      .update({ summary_text: thSummarySync })
      .eq('processed_knowledge_id', id)
      .eq('model', 'th');
  }

  if (!skipRevalidate) {
    revalidatePath('/community/boards', 'layout');
    revalidatePath('/tips', 'layout');
    if (boardPostIdForRevalidate) {
      revalidatePath(`/community/boards/${boardPostIdForRevalidate}`);
      revalidatePath(`/tips/${boardPostIdForRevalidate}`);
    }
  }

  return { ok: true, published: willPublish };
}
