import 'server-only';

import {
  isKnowledgeLlmConfigured,
  reprocessKnowledgeDraftWithLlm,
} from '@/bots/actions/processAndPersistKnowledge';
import {
  executeKnowledgePublishOrDraft,
  type KnowledgeFieldPatch,
  type ProcessedKnowledgeRow,
} from '@/lib/knowledge/knowledgeQueuePublishCore';
import { createServiceRoleClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createServiceRoleClient>;

/**
 * Zero-Raw: 게시 직전 검증 실패 시 1회 LLM 재가공(JSON 컨셉) 후 다시 게시.
 * 재가공으로 `processed_knowledge` id가 바뀔 수 있어, 두 번째 시도는 새 행 기준·패치 없이 진행한다.
 */
export async function executeKnowledgePublishWithAutoConcept(
  admin: AdminClient,
  params: {
    row: ProcessedKnowledgeRow;
    authorId: string;
    fieldPatch: KnowledgeFieldPatch;
    skipRevalidate?: boolean;
  },
): Promise<
  | {
      ok: true;
      published: boolean;
      auto_enriched: boolean;
      effective_processed_knowledge_id: string;
    }
  | { ok: false; error: string; status: number }
> {
  let currentId = params.row.id;
  let row: ProcessedKnowledgeRow = params.row;
  let autoEnriched = false;
  let fieldPatch = params.fieldPatch;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await executeKnowledgePublishOrDraft(admin, {
      row: { ...row, id: currentId },
      authorId: params.authorId,
      action: 'publish',
      fieldPatch,
      skipRevalidate: params.skipRevalidate,
    });
    if (result.ok) {
      return {
        ok: true,
        published: result.published,
        auto_enriched: autoEnriched,
        effective_processed_knowledge_id: currentId,
      };
    }
    if (attempt === 1) {
      return result;
    }
    if (!isKnowledgeLlmConfigured()) {
      return result;
    }
    if (result.status !== 400) {
      return result;
    }

    const rr = await reprocessKnowledgeDraftWithLlm(currentId);
    if (!rr.ok || !rr.processed_knowledge_id) {
      return { ok: false, error: rr.error ?? 'llm_reprocess_failed', status: 400 };
    }
    autoEnriched = true;
    currentId = rr.processed_knowledge_id;
    const { data: row2, error: fe } = await admin
      .from('processed_knowledge')
      .select('id, clean_body, published, raw_knowledge_id, post_id, board_target, raw_knowledge(external_url)')
      .eq('id', currentId)
      .maybeSingle();
    if (fe || !row2) {
      return { ok: false, error: '재가공 후 초안을 찾을 수 없습니다.', status: 500 };
    }
    row = row2 as unknown as ProcessedKnowledgeRow;
    fieldPatch = {};
  }
  return { ok: false, error: 'unexpected', status: 500 };
}
