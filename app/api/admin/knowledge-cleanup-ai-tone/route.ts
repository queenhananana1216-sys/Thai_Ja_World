import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { normalizeUserFacingText } from '@/lib/content/humanizeText';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const maxDuration = 120;

type KnowledgeCleanBody = {
  ko?: {
    title?: string;
    summary?: string;
    editorial_note?: string;
    checklist?: string[];
    cautions?: string[];
    tags?: string[];
  };
  th?: {
    title?: string;
    summary?: string;
    editorial_note?: string;
    checklist?: string[];
    cautions?: string[];
    tags?: string[];
  };
};

function allowedActor(email: string | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const list = parseAdminAllowedEmails();
  if (list.length === 0) return true;
  return list.includes(e);
}

function normalizeArr(arr: string[] | undefined, maxLen: number): string[] | undefined {
  if (!Array.isArray(arr)) return arr;
  return arr
    .map((x) => normalizeUserFacingText(String(x), { maxLen }))
    .filter((x) => x.length > 0);
}

function normalizeKnowledgeCleanBody(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as KnowledgeCleanBody;
    if (!parsed || typeof parsed !== 'object') return raw;

    if (parsed.ko) {
      if (typeof parsed.ko.title === 'string') {
        parsed.ko.title = normalizeUserFacingText(parsed.ko.title, { singleLine: true, maxLen: 200 });
      }
      if (typeof parsed.ko.summary === 'string') {
        parsed.ko.summary = normalizeUserFacingText(parsed.ko.summary, { maxLen: 7000 });
      }
      if (typeof parsed.ko.editorial_note === 'string') {
        parsed.ko.editorial_note = normalizeUserFacingText(parsed.ko.editorial_note, { maxLen: 2000 });
      }
      parsed.ko.checklist = normalizeArr(parsed.ko.checklist, 500);
      parsed.ko.cautions = normalizeArr(parsed.ko.cautions, 500);
      parsed.ko.tags = normalizeArr(parsed.ko.tags, 60);
    }

    if (parsed.th) {
      if (typeof parsed.th.title === 'string') {
        parsed.th.title = normalizeUserFacingText(parsed.th.title, { singleLine: true, maxLen: 200 });
      }
      if (typeof parsed.th.summary === 'string') {
        parsed.th.summary = normalizeUserFacingText(parsed.th.summary, { maxLen: 7000 });
      }
      if (typeof parsed.th.editorial_note === 'string') {
        parsed.th.editorial_note = normalizeUserFacingText(parsed.th.editorial_note, { maxLen: 2000 });
      }
      parsed.th.checklist = normalizeArr(parsed.th.checklist, 500);
      parsed.th.cautions = normalizeArr(parsed.th.cautions, 500);
      parsed.th.tags = normalizeArr(parsed.th.tags, 60);
    }

    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
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

  let dryRun = false;
  try {
    const body = (await req.json()) as { dry_run?: boolean };
    dryRun = Boolean(body?.dry_run);
  } catch {
    dryRun = false;
  }

  const admin = createServiceRoleClient();

  const stats = {
    dry_run: dryRun,
    posts_scanned: 0,
    posts_updated: 0,
    processed_scanned: 0,
    processed_updated: 0,
    summaries_scanned: 0,
    summaries_updated: 0,
  };

  const { data: posts, error: postsErr } = await admin
    .from('posts')
    .select('id,title,excerpt,content,is_knowledge_tip')
    .eq('is_knowledge_tip', true)
    .limit(1000);
  if (postsErr) {
    return NextResponse.json({ error: postsErr.message }, { status: 500 });
  }

  for (const row of posts ?? []) {
    stats.posts_scanned += 1;
    const nextTitle = normalizeUserFacingText(String(row.title ?? ''), { singleLine: true, maxLen: 200 }) || '(제목 없음)';
    const nextExcerpt = normalizeUserFacingText(String(row.excerpt ?? ''), { singleLine: true, maxLen: 500 });
    const nextContent = normalizeUserFacingText(String(row.content ?? ''), { maxLen: 20000 });
    const changed =
      nextTitle !== String(row.title ?? '') ||
      nextExcerpt !== String(row.excerpt ?? '') ||
      nextContent !== String(row.content ?? '');
    if (!changed) continue;
    stats.posts_updated += 1;
    if (!dryRun) {
      const { error: upErr } = await admin
        .from('posts')
        .update({
          title: nextTitle,
          excerpt: nextExcerpt || null,
          content: nextContent,
        })
        .eq('id', String(row.id));
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }
  }

  const { data: processedRows, error: processedErr } = await admin
    .from('processed_knowledge')
    .select('id,clean_body')
    .limit(1000);
  if (processedErr) {
    return NextResponse.json({ error: processedErr.message }, { status: 500 });
  }

  for (const row of processedRows ?? []) {
    stats.processed_scanned += 1;
    const current = String(row.clean_body ?? '');
    if (!current) continue;
    const next = normalizeKnowledgeCleanBody(current);
    if (next === current) continue;
    stats.processed_updated += 1;
    if (!dryRun) {
      const { error: upErr } = await admin
        .from('processed_knowledge')
        .update({ clean_body: next })
        .eq('id', String(row.id));
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }
  }

  const { data: summaryRows, error: summaryErr } = await admin
    .from('knowledge_summaries')
    .select('id,summary_text')
    .limit(2000);
  if (summaryErr) {
    return NextResponse.json({ error: summaryErr.message }, { status: 500 });
  }

  for (const row of summaryRows ?? []) {
    stats.summaries_scanned += 1;
    const current = String(row.summary_text ?? '');
    const next = normalizeUserFacingText(current, { maxLen: 7000 });
    if (next === current) continue;
    stats.summaries_updated += 1;
    if (!dryRun) {
      const { error: upErr } = await admin
        .from('knowledge_summaries')
        .update({ summary_text: next })
        .eq('id', String(row.id));
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true, ...stats });
}
