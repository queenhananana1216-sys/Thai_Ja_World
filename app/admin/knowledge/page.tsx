/**
 * /admin/knowledge — 지식 초안 큐(비공개 published=false)
 *
 * DB: 011_knowledge_pipeline.sql / 012_knowledge_publish_to_posts.sql 적용 필요
 */
import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import AdminKnowledgeImportClient from './_components/AdminKnowledgeImportClient';
import KnowledgeQueueClient, {
  type KnowledgeQueueDiagnostics,
  type KnowledgeQueueItem,
} from './_components/KnowledgeQueueClient';
import type { KnowledgeLlmOutput } from '@/lib/knowledge/knowledgeLlmTypes';
import { knowledgeInsertAsPublished } from '@/lib/knowledge/knowledgePublishMode';
import { getKnowledgeLlmAdminStatus } from '@/bots/actions/processAndPersistKnowledge';

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
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const llmAdmin = getKnowledgeLlmAdminStatus();

  let diagnostics: KnowledgeQueueDiagnostics | null = null;
  try {
    const [dDraft, dPub, dRaw] = await Promise.all([
      admin.from('processed_knowledge').select('id', { count: 'exact', head: true }).eq('published', false),
      admin.from('processed_knowledge').select('id', { count: 'exact', head: true }).eq('published', true),
      admin.from('raw_knowledge').select('id', { count: 'exact', head: true }).gte('fetched_at', since14d),
    ]);
    diagnostics = {
      draftCount: dDraft.count ?? 0,
      publishedCount: dPub.count ?? 0,
      rawRecentCount: dRaw.count ?? 0,
      knowledgeModeAuto: knowledgeInsertAsPublished(),
      knowledgeLlmConfigured: llmAdmin.configured,
      knowledgeLlmProviderSetting: llmAdmin.providerSetting,
    };
  } catch {
    diagnostics = {
      draftCount: 0,
      publishedCount: 0,
      rawRecentCount: 0,
      knowledgeModeAuto: knowledgeInsertAsPublished(),
      knowledgeLlmConfigured: llmAdmin.configured,
      knowledgeLlmProviderSetting: llmAdmin.providerSetting,
    };
  }

  let orphanRawKnowledge: Array<{
    id: string;
    title_original: string;
    external_url: string | null;
    fetched_at: string;
  }> = [];
  try {
    const { data: linked } = await admin.from('processed_knowledge').select('raw_knowledge_id');
    const done = new Set((linked ?? []).map((r) => String(r.raw_knowledge_id)));
    const { data: raws } = await admin
      .from('raw_knowledge')
      .select('id, title_original, external_url, fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(120);
    orphanRawKnowledge = (raws ?? [])
      .filter((r) => !done.has(String(r.id)))
      .slice(0, 80)
      .map((r) => ({
        id: String(r.id),
        title_original: ((r.title_original as string) ?? '').trim() || '(제목 없음)',
        external_url: (r.external_url as string | null) ?? null,
        fetched_at: String(r.fetched_at ?? ''),
      }));
  } catch {
    orphanRawKnowledge = [];
  }

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
      ko_editorial_note:
        typeof ko?.editorial_note === 'string' ? ko.editorial_note.trim() : '',
      ko_checklist: Array.isArray(ko?.checklist) ? ko!.checklist.map((x) => String(x)) : [],
      ko_cautions: Array.isArray(ko?.cautions) ? ko!.cautions.map((x) => String(x)) : [],
      ko_tags: Array.isArray(ko?.tags) ? ko!.tags.map((x) => String(x)).slice(0, 8) : [],
      th_title: th?.title?.trim() || '',
      th_summary: th?.summary?.trim() || '',
      th_editorial_note:
        typeof th?.editorial_note === 'string' ? th.editorial_note.trim() : '',
      confidence_level: llm?.editorial_meta?.confidence_level ?? 'medium',
      novelty_score: llm?.editorial_meta?.novelty_score ?? 50,
      usefulness_score: llm?.editorial_meta?.usefulness_score ?? 50,
    });
  }

  return (
    <div className="admin-page-narrow" style={{ padding: '20px 24px', maxWidth: 960, margin: '0 auto' }}>
      <h1 className="admin-dash__title" style={{ fontSize: '1.25rem' }}>
        꿀팁 · 지식 큐
      </h1>
      <p className="admin-dash__lead" style={{ maxWidth: '62ch' }}>
        운영팀 가공 결과 <strong>컨셉 카드</strong>를 확인하고 <strong>게시하기</strong> 또는 <strong>다시 가공</strong>을 쓰면 됩니다. 수동
        편집은 카드 아래 「상세 편집」에서 엽니다.{' '}
        <Link href="/admin/publish" style={{ color: 'var(--admin-link)' }}>
          승인 허브 →
        </Link>
      </p>

      <AdminKnowledgeImportClient />

      <KnowledgeQueueClient items={items} diagnostics={diagnostics} orphanRawKnowledge={orphanRawKnowledge} />
    </div>
  );
}
