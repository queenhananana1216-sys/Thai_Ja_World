/**
 * 제미나이·편집팀 정리 JSON 일괄 업로드 → raw_knowledge + processed_knowledge 초안(published=false).
 * 이후 /admin/knowledge 에서 «꿀팁 일괄 승인» 또는 개별 «최종 승인」만 누르면 /tips·광장에 반영됩니다.
 *
 * POST JSON: { "items": [ { external_url, title_original?, board_target?, ko{title,summary,...}, th{...}, sources?[] } ] }
 * 최대 40건/요청.
 */

import { NextResponse } from 'next/server';
import type { KnowledgeLlmOutput } from '@/bots/actions/processAndPersistKnowledge';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
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

type ImportKo = {
  title: string;
  summary: string;
  editorial_note?: string;
  checklist?: string[];
  cautions?: string[];
  tags?: string[];
};

type ImportTh = {
  title: string;
  summary: string;
  editorial_note?: string;
  checklist?: string[];
  cautions?: string[];
  tags?: string[];
};

type ImportItem = {
  external_url: string;
  title_original?: string;
  board_target?: 'tips_board' | 'board_board';
  ko: ImportKo;
  th: ImportTh;
  editorial_meta?: Partial<KnowledgeLlmOutput['editorial_meta']>;
  sources?: KnowledgeLlmOutput['sources'];
};

function toLlm(item: ImportItem): KnowledgeLlmOutput {
  const url = item.external_url.trim();
  const now = new Date().toISOString();
  const bt = item.board_target === 'board_board' ? 'board_board' : 'tips_board';
  const em = item.editorial_meta ?? {};
  return {
    board_target: bt,
    editorial_meta: {
      novelty_score: typeof em.novelty_score === 'number' ? em.novelty_score : 78,
      usefulness_score: typeof em.usefulness_score === 'number' ? em.usefulness_score : 78,
      confidence_level: em.confidence_level === 'low' || em.confidence_level === 'high' ? em.confidence_level : 'high',
      reasons: Array.isArray(em.reasons) ? em.reasons.map(String) : ['gemini_import'],
    },
    ko: {
      title: item.ko.title.trim(),
      summary: item.ko.summary.trim(),
      editorial_note: item.ko.editorial_note?.trim() || undefined,
      checklist: Array.isArray(item.ko.checklist) ? item.ko.checklist.map(String) : [],
      cautions: Array.isArray(item.ko.cautions) ? item.ko.cautions.map(String) : [],
      tags: Array.isArray(item.ko.tags) ? item.ko.tags.map(String).slice(0, 12) : [],
    },
    th: {
      title: item.th.title.trim(),
      summary: item.th.summary.trim(),
      editorial_note: item.th.editorial_note?.trim() || undefined,
      checklist: Array.isArray(item.th.checklist) ? item.th.checklist.map(String) : [],
      cautions: Array.isArray(item.th.cautions) ? item.th.cautions.map(String) : [],
      tags: Array.isArray(item.th.tags) ? item.th.tags.map(String).slice(0, 12) : [],
    },
    board_copy: {
      category_badge_text: bt === 'tips_board' ? '꿀팁' : '가이드',
      category_description: '',
    },
    sources:
      Array.isArray(item.sources) && item.sources.length > 0
        ? item.sources.map((s) => ({
            external_url: String(s.external_url ?? url).trim(),
            source_name: String(s.source_name ?? ''),
            retrieved_at: String(s.retrieved_at ?? now),
          }))
        : [{ external_url: url, source_name: '', retrieved_at: now }],
  };
}

export async function POST(req: Request) {
  const supabaseAuth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!allowedActor(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  let body: { items?: ImportItem[] };
  try {
    body = (await req.json()) as { items?: ImportItem[] };
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
  if (items.length === 0) {
    return NextResponse.json({ error: 'items 배열이 필요합니다(최대 40건).' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const results: Array<{ index: number; ok: boolean; processed_knowledge_id?: string; error?: string }> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) {
      results.push({ index: i, ok: false, error: '항목 누락' });
      continue;
    }
    const url = typeof item.external_url === 'string' ? item.external_url.trim() : '';
    if (!url || !item.ko?.title?.trim() || !item.ko?.summary?.trim() || !item.th?.title?.trim() || !item.th?.summary?.trim()) {
      results.push({ index: i, ok: false, error: 'external_url, ko.title/summary, th.title/summary 필수' });
      continue;
    }

    try {
      const llm = toLlm(item as ImportItem);
      const cleanJson = JSON.stringify(llm);
      const titleOriginal = (item.title_original ?? item.ko.title).trim().slice(0, 500);

      let rawId: string;
      const { data: existingRaw } = await admin.from('raw_knowledge').select('id').eq('external_url', url).maybeSingle();
      if (existingRaw?.id) {
        rawId = String(existingRaw.id);
        await admin
          .from('raw_knowledge')
          .update({ title_original: titleOriginal, fetched_at: new Date().toISOString() })
          .eq('id', rawId);
      } else {
        const { data: insRaw, error: rawErr } = await admin
          .from('raw_knowledge')
          .insert({
            external_url: url,
            title_original: titleOriginal,
            raw_body: null,
            source_id: null,
          })
          .select('id')
          .single();
        if (rawErr || !insRaw?.id) {
          results.push({ index: i, ok: false, error: rawErr?.message ?? 'raw_knowledge insert 실패' });
          continue;
        }
        rawId = String(insRaw.id);
      }

      const { data: existingPk } = await admin
        .from('processed_knowledge')
        .select('id, post_id')
        .eq('raw_knowledge_id', rawId)
        .maybeSingle();

      let pkId: string;
      if (existingPk?.id) {
        pkId = String(existingPk.id);
        const oldPost = existingPk.post_id as string | null;
        if (oldPost) {
          await admin.from('posts').delete().eq('id', oldPost);
        }
        const { error: upPk } = await admin
          .from('processed_knowledge')
          .update({
            clean_body: cleanJson,
            published: false,
            board_target: llm.board_target,
            post_id: null,
          })
          .eq('id', pkId);
        if (upPk) {
          results.push({ index: i, ok: false, error: upPk.message });
          continue;
        }
      } else {
        const { data: insPk, error: pkErr } = await admin
          .from('processed_knowledge')
          .insert({
            raw_knowledge_id: rawId,
            clean_body: cleanJson,
            published: false,
            board_target: llm.board_target,
            language_default: 'ko',
          })
          .select('id')
          .single();
        if (pkErr || !insPk?.id) {
          results.push({ index: i, ok: false, error: pkErr?.message ?? 'processed_knowledge insert 실패' });
          continue;
        }
        pkId = String(insPk.id);
      }

      await admin.from('knowledge_summaries').delete().eq('processed_knowledge_id', pkId);

      const koText = [llm.ko.summary, llm.ko.editorial_note].filter(Boolean).join('\n\n').trim();
      const thText = [llm.th.summary, llm.th.editorial_note].filter(Boolean).join('\n\n').trim();

      const { error: sumKoErr } = await admin.from('knowledge_summaries').insert({
        processed_knowledge_id: pkId,
        summary_text: koText || llm.ko.title,
        model: 'ko',
      });
      if (sumKoErr) {
        results.push({ index: i, ok: false, error: sumKoErr.message });
        continue;
      }
      const { error: sumThErr } = await admin.from('knowledge_summaries').insert({
        processed_knowledge_id: pkId,
        summary_text: thText || llm.th.title,
        model: 'th',
      });
      if (sumThErr) {
        results.push({ index: i, ok: false, error: sumThErr.message });
        continue;
      }

      results.push({ index: i, ok: true, processed_knowledge_id: pkId });
    } catch (e) {
      results.push({ index: i, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    imported: okCount,
    failed: results.length - okCount,
    results,
  });
}
