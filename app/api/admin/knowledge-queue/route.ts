/**
 * 관리자 지식 컨텐츠 초안 편집·게시·삭제
 *
 * action: publish | draft | delete
 *   publish — processed_knowledge.published=true + clean_body 타이틀/요약 수정 반영
 *   draft   — published=false 유지 + 수정 내용 저장
 *   delete  — raw_knowledge 삭제 (cascade: processed_knowledge, knowledge_summaries 함께 삭제)
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import type { KnowledgeLlmOutput } from '@/bots/actions/processAndPersistKnowledge';
import { KNOWLEDGE_STUB_SUMMARY_SNIPPET } from '@/lib/knowledge/knowledgeStubConstants';
import {
  containsAiLikeMarker,
  normalizeUserFacingText,
} from '@/lib/content/humanizeText';

export const runtime = 'nodejs';

type Body = {
  processed_knowledge_id?: string;
  action?: 'publish' | 'draft' | 'delete';
  ko_title?: string;
  ko_summary?: string;
  /** LLM 요약이 짧을 때 편집팀·이용자 안내(게시 본문·훅에 반영) */
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

/** clean_body JSON 에서 ko/th title·summary 만 덮어쓰기 */
function mergeKnowledgeCleanBody(
  existing: unknown,
  patch: {
    ko_title?: string;
    ko_summary?: string;
    ko_editorial_note?: string;
    th_title?: string;
    th_summary?: string;
    th_editorial_note?: string;
  },
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
    // 기존 clean_body 없으면 최소 구조 생성
    return JSON.stringify({
      ko: {
        title: normalizeUserFacingText(patch.ko_title ?? '', { maxLen: 200 }),
        summary: normalizeUserFacingText(patch.ko_summary ?? '', { maxLen: 7000 }),
        editorial_note: normalizeUserFacingText(patch.ko_editorial_note ?? '', { maxLen: 2000 }),
        checklist: [],
        cautions: [],
        tags: [],
      },
      th: {
        title: normalizeUserFacingText(patch.th_title ?? '', { maxLen: 200 }),
        summary: normalizeUserFacingText(patch.th_summary ?? '', { maxLen: 7000 }),
        editorial_note: normalizeUserFacingText(patch.th_editorial_note ?? '', { maxLen: 2000 }),
        checklist: [],
        cautions: [],
        tags: [],
      },
    });
  }

  if (patch.ko_title !== undefined && parsed.ko) {
    parsed.ko.title = normalizeUserFacingText(patch.ko_title, { maxLen: 200 });
  }
  if (patch.ko_summary !== undefined && parsed.ko) {
    parsed.ko.summary = normalizeUserFacingText(patch.ko_summary, { maxLen: 7000 });
  }
  if (patch.ko_editorial_note !== undefined && parsed.ko) {
    const t = normalizeUserFacingText(patch.ko_editorial_note, { maxLen: 2000 });
    if (t) parsed.ko.editorial_note = t;
    else delete parsed.ko.editorial_note;
  }
  if (patch.th_title !== undefined && parsed.th) {
    parsed.th.title = normalizeUserFacingText(patch.th_title, { maxLen: 200 });
  }
  if (patch.th_summary !== undefined && parsed.th) {
    parsed.th.summary = normalizeUserFacingText(patch.th_summary, { maxLen: 7000 });
  }
  if (patch.th_editorial_note !== undefined && parsed.th) {
    const t = normalizeUserFacingText(patch.th_editorial_note, { maxLen: 2000 });
    if (t) parsed.th.editorial_note = t;
    else delete parsed.th.editorial_note;
  }

  return JSON.stringify(parsed);
}

function parseKnowledgeCleanBody(existing: unknown): KnowledgeLlmOutput | null {
  try {
    if (typeof existing === 'string') return JSON.parse(existing) as KnowledgeLlmOutput;
    if (existing && typeof existing === 'object') return existing as KnowledgeLlmOutput;
  } catch {
    /* ignore */
  }
  return null;
}

function boardTargetToPostCategory(boardTarget: 'tips_board' | 'board_board'): string {
  // posts.category 는 project 스키마에 존재하는 슬러그만 사용
  return boardTarget === 'tips_board' ? 'info' : 'free';
}

function bullets(items: string[]): string {
  const list = (items ?? []).map((s) => (s ?? '').trim()).filter(Boolean);
  if (!list.length) return '- (없음)';
  return list.map((x) => `- ${x}`).join('\n');
}

/** 비회원 /tips 허브용 짧은 훅 — 한국어 요약 앞부분 우선 */
function excerptFromKoSummary(summary: string): string {
  const t = normalizeUserFacingText(summary, { maxLen: 1000 });
  if (!t) return '';
  const firstBlock = t.split(/\n{2,}/)[0]?.trim() ?? t;
  const oneLine = firstBlock.split('\n')[0]?.trim() ?? firstBlock;
  const base = oneLine.length > 280 ? `${oneLine.slice(0, 277)}…` : oneLine;
  return base.slice(0, 500);
}

function isStubLikeKoSummary(summary: string): boolean {
  return summary.trim().includes(KNOWLEDGE_STUB_SUMMARY_SNIPPET);
}

/** 스텁·짧은 LLM 요약이면 편집팀 안내를 훅으로 우선 */
function excerptFromKnowledgeKo(ko: { summary: string; editorial_note?: string }): string {
  const ed = normalizeUserFacingText(ko.editorial_note, { maxLen: 2000 });
  const sum = normalizeUserFacingText(ko.summary, { maxLen: 7000 });
  if (ed && isStubLikeKoSummary(sum)) return excerptFromKoSummary(ed);
  if (ed && sum) return excerptFromKoSummary(`${sum}\n\n${ed}`);
  if (ed) return excerptFromKoSummary(ed);
  return excerptFromKoSummary(sum);
}

function validateKnowledgePublish(ko_summary: string, ko_editorial_note: string): string | null {
  const sum = normalizeUserFacingText(ko_summary, { maxLen: 7000 });
  const ed = normalizeUserFacingText(ko_editorial_note, { maxLen: 2000 });
  if (containsAiLikeMarker(ko_summary) || containsAiLikeMarker(ko_editorial_note)) {
    if (sum.length < 10 && ed.length < 25) {
      return 'AI 템플릿 문구를 자동 정리했지만 본문이 너무 짧아요. 요약 또는 안내를 조금 더 보강해 주세요.';
    }
  }
  if (isStubLikeKoSummary(sum)) {
    if (ed.length < 25) {
      return '원문 요약이 비어 있을 때는 「태자 편집팀·이용자 안내」에 25자 이상 적어 주시면 게시할 수 있어요.';
    }
    return null;
  }
  if (sum.length < 10) {
    return '한국어 요약을 10자 이상 작성해 주세요.';
  }
  return null;
}

function buildPostContent(llm: KnowledgeLlmOutput, fallbackSourceUrl?: string): string {
  const ko = llm.ko;
  const th = llm.th;
  const sources =
    Array.isArray(llm.sources) && llm.sources.length > 0
      ? llm.sources
      : fallbackSourceUrl
        ? [{ external_url: fallbackSourceUrl, source_name: '', retrieved_at: new Date().toISOString() }]
        : [];
  const sourceLines = bullets(sources.map((s) => s.external_url).filter(Boolean));

  const koLines = [
    `요약\n${normalizeUserFacingText(ko.summary, { maxLen: 7000 })}`,
    normalizeUserFacingText(ko.editorial_note, { maxLen: 2000 })
      ? `\n태자 편집팀·이용자 안내\n${normalizeUserFacingText(ko.editorial_note, { maxLen: 2000 })}`
      : '',
    `\n체크리스트\n${bullets(ko.checklist)}`,
    `\n주의사항\n${bullets(ko.cautions)}`,
    ko.tags.length ? `\n태그\n${ko.tags.map((t) => `#${t}`).join(' ')}` : '',
    `\n출처\n${sourceLines}`,
  ].filter(Boolean);

  const thLines = [
    `\n---\nไทย 요약\n${normalizeUserFacingText(th.summary, { maxLen: 7000 })}`,
    normalizeUserFacingText(th.editorial_note, { maxLen: 2000 })
      ? `\nหมายเหตุทีมบรรณาธิการ\n${normalizeUserFacingText(th.editorial_note, { maxLen: 2000 })}`
      : '',
    `\n체็กลิสต์\n${bullets(th.checklist)}`,
    `\nข้อควรระวัง\n${bullets(th.cautions)}`,
    th.tags.length ? `\nแท็ก\n${th.tags.map((t) => `#${t}`).join(' ')}` : '',
  ].filter(Boolean);

  // posts.content 는 그대로 표시되므로 전부 pre-wrap 형태를 기대한다.
  return [...koLines, ...thLines].join('\n');
}

export async function POST(req: Request) {
  const supabaseAuth = await createServerSupabaseAuthClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
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

  // ── delete ────────────────────────────────────────────────────────────
  if (body.action === 'delete') {
    const rawId = row.raw_knowledge_id as string;
    if (row.post_id) {
      await admin.from('posts').delete().eq('id', row.post_id as string);
    }
    const { error: delErr } = await admin.from('raw_knowledge').delete().eq('id', rawId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    revalidatePath('/community/boards', 'layout');
    revalidatePath('/tips', 'layout');
    return NextResponse.json({ ok: true, deleted: true });
  }

  // ── publish / draft ───────────────────────────────────────────────────
  const action = body.action === 'draft' ? 'draft' : 'publish';
  const willPublish = action === 'publish';
  const moderationStatus = willPublish ? 'safe' : 'hidden';

  if (willPublish) {
    const pubErr = validateKnowledgePublish(
      typeof body.ko_summary === 'string' ? body.ko_summary : '',
      typeof body.ko_editorial_note === 'string' ? body.ko_editorial_note : '',
    );
    if (pubErr) {
      return NextResponse.json({ error: pubErr }, { status: 400 });
    }
  }

  const nextBody = mergeKnowledgeCleanBody(row.clean_body, {
    ko_title: body.ko_title,
    ko_summary: body.ko_summary,
    ko_editorial_note: body.ko_editorial_note,
    th_title: body.th_title,
    th_summary: body.th_summary,
    th_editorial_note: body.th_editorial_note,
  });

  const { error: upErr } = await admin
    .from('processed_knowledge')
    .update({ clean_body: nextBody, published: willPublish })
    .eq('id', id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // ── publish 시 posts 로 변환(= 공개 보드 게시) ─────────────────────────
  // draft 상태에서는 posts 를 hidden 처리만 하여 노출을 끈다.
  const llm = parseKnowledgeCleanBody(nextBody);
  const boardTarget = (llm?.board_target ?? row.board_target) as 'tips_board' | 'board_board';
  const category = boardTargetToPostCategory(boardTarget);
  const authorId = user?.id as string;
  const rawExternalUrl =
    (row.raw_knowledge as unknown as { external_url?: string } | null)?.external_url ?? undefined;

  const postTitle =
    normalizeUserFacingText(llm?.ko?.title || body.ko_title || '', { maxLen: 200 }) || '(제목 없음)';
  const postContent = llm
    ? buildPostContent(llm, rawExternalUrl)
    : normalizeUserFacingText(body.ko_summary, { maxLen: 7000 }) || '';
  const postExcerpt = llm?.ko
    ? excerptFromKnowledgeKo({
        summary: (body.ko_summary ?? llm.ko.summary ?? '').trim(),
        editorial_note: (body.ko_editorial_note ?? llm.ko.editorial_note ?? '').trim() || undefined,
      })
    : excerptFromKoSummary((body.ko_summary ?? '').trim());

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
        return NextResponse.json({ error: pUpErr.message }, { status: 500 });
      }
    } else {
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
        return NextResponse.json({ error: pInsErr?.message ?? 'posts insert 실패' }, { status: 500 });
      }
      nextPostId = String(ins.id);

      const { error: pkErr } = await admin
        .from('processed_knowledge')
        .update({ post_id: nextPostId })
        .eq('id', id);
      if (pkErr) {
        return NextResponse.json({ error: pkErr.message }, { status: 500 });
      }
    }
    boardPostIdForRevalidate = nextPostId;
  }

  // knowledge_summaries 동기화 (편집팀 안내는 검색·노출용 텍스트에 합침)
  const koSummarySync = [
    normalizeUserFacingText(body.ko_summary, { maxLen: 7000 }),
    normalizeUserFacingText(body.ko_editorial_note, { maxLen: 2000 }),
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();
  if (koSummarySync) {
    await admin
      .from('knowledge_summaries')
      .update({ summary_text: koSummarySync })
      .eq('processed_knowledge_id', id)
      .eq('model', 'ko');
  }
  const thSummarySync = [
    normalizeUserFacingText(body.th_summary, { maxLen: 7000 }),
    normalizeUserFacingText(body.th_editorial_note, { maxLen: 2000 }),
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();
  if (thSummarySync) {
    await admin
      .from('knowledge_summaries')
      .update({ summary_text: thSummarySync })
      .eq('processed_knowledge_id', id)
      .eq('model', 'th');
  }

  revalidatePath('/community/boards', 'layout');
  revalidatePath('/tips', 'layout');
  if (boardPostIdForRevalidate) {
    revalidatePath(`/community/boards/${boardPostIdForRevalidate}`);
    revalidatePath(`/tips/${boardPostIdForRevalidate}`);
  }

  return NextResponse.json({ ok: true, published: action === 'publish' });
}
