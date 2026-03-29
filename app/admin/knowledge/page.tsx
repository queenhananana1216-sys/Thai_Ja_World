/**
 * /admin/knowledge — 지식 초안 큐(비공개 published=false)
 *
 * DB: 011_knowledge_pipeline.sql / 012_knowledge_publish_to_posts.sql 적용 필요
 */
import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import KnowledgeQueueClient, { type KnowledgeQueueItem } from './_components/KnowledgeQueueClient';
import type { KnowledgeLlmOutput } from '@/bots/actions/processAndPersistKnowledge';

function parseKnowledgeCleanBody(existing: unknown): KnowledgeLlmOutput | null {
  try {
    if (typeof existing === 'string') return JSON.parse(existing) as KnowledgeLlmOutput;
    if (existing && typeof existing === 'object') return existing as KnowledgeLlmOutput;
  } catch {
    /* ignore */
  }
  return null;
}

export default async function AdminKnowledgeQueuePage() {
  const admin = createServiceRoleClient();

  const { data: rows, error } = await admin
    .from('processed_knowledge')
    .select(
      'id, created_at, board_target, clean_body, raw_knowledge(external_url, title_original)',
    )
    .eq('published', false)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div style={{ padding: '20px 24px', maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700 }}>지식 초안 큐</h1>
        <p style={{ color: '#b91c1c', fontSize: 13, lineHeight: 1.6 }}>
          DB 오류: {error.message}
        </p>
      </div>
    );
  }

  const items: KnowledgeQueueItem[] = [];
  for (const r of rows ?? []) {
    const raw = r.raw_knowledge as unknown as { external_url: string; title_original: string } | null;
    const rawUrl = raw?.external_url ?? '#';
    const rawTitle = raw?.title_original?.trim() || '(제목 없음)';

    const llm = parseKnowledgeCleanBody(r.clean_body);
    const board_target = (llm?.board_target ?? r.board_target ?? 'board_board') as
      | 'tips_board'
      | 'board_board';

    const ko = llm?.ko;
    const th = llm?.th;

    items.push({
      id: String(r.id),
      created_at: String(r.created_at),
      board_target,
      raw_url: rawUrl,
      raw_title: rawTitle,
      ko_title: ko?.title?.trim() || rawTitle,
      ko_summary: ko?.summary?.trim() || '',
      ko_checklist: Array.isArray(ko?.checklist) ? ko!.checklist.map((x) => String(x)) : [],
      ko_cautions: Array.isArray(ko?.cautions) ? ko!.cautions.map((x) => String(x)) : [],
      ko_tags: Array.isArray(ko?.tags) ? ko!.tags.map((x) => String(x)).slice(0, 8) : [],
      th_title: th?.title?.trim() || '',
      th_summary: th?.summary?.trim() || '',
      confidence_level: llm?.editorial_meta?.confidence_level ?? 'medium',
      novelty_score: llm?.editorial_meta?.novelty_score ?? 50,
      usefulness_score: llm?.editorial_meta?.usefulness_score ?? 50,
    });
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, margin: '0 0 8px', fontWeight: 700 }}>지식 초안 큐</h1>
      <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>
        <strong>기본(미설정)</strong>은 manual과 같아 초안에 쌓입니다. <code>KNOWLEDGE_PUBLISH_MODE=auto</code>이면 가공
        직후 공개될 수 있어 이 큐가 비어 있을 수 있어요.
        <br />
        <br />
        승인 시 <strong>공개 게시판(posts)</strong>에 올라갑니다. 비어 있고 봇 기록에는 성공만 보이면{' '}
        <Link href="/admin/bot-actions" style={{ color: '#2563eb' }}>
          봇 기록
        </Link>
        에서 지식 크론·LLM 오류를 확인해 보세요.
      </p>

      <KnowledgeQueueClient items={items} />
    </div>
  );
}
