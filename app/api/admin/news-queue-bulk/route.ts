import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import {
  adminReprocessProcessedNewsKoreanOnly,
  isNewsSummaryLlmConfigured,
} from '@/bots/actions/summarizeAndPersistNews';
import { validateProcessedNewsRowForPublish } from '@/lib/news/validateNewsPublish';
import { requestGoogleIndexing } from '@/lib/seo/googleIndexing';
import { absoluteUrl } from '@/lib/seo/site';
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

  let body: { limit?: number };
  try {
    body = (await req.json()) as { limit?: number };
  } catch {
    body = {};
  }

  const limit = Math.min(120, Math.max(1, Number(body.limit) || 60));
  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from('processed_news')
    .select('id, clean_body, raw_news(title), summaries(summary_text, model)')
    .eq('published', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const toPublish: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];
  let auto_enriched = 0;

  for (const r of rows ?? []) {
    const id = String(r.id);
    const rn = r.raw_news as unknown as { title: string } | null;
    const sums = r.summaries as unknown as { summary_text: string; model: string | null }[] | null;
    let err = validateProcessedNewsRowForPublish(r.clean_body as string | null, rn?.title ?? null, sums ?? null);

    if (err && isNewsSummaryLlmConfigured()) {
      const rr = await adminReprocessProcessedNewsKoreanOnly(id);
      if (rr.ok) {
        const { data: r2, error: e2 } = await admin
          .from('processed_news')
          .select('id, clean_body, raw_news(title), summaries(summary_text, model)')
          .eq('id', id)
          .maybeSingle();
        if (!e2 && r2) {
          const rn2 = r2.raw_news as unknown as { title: string } | null;
          const sums2 = r2.summaries as unknown as { summary_text: string; model: string | null }[] | null;
          err = validateProcessedNewsRowForPublish(r2.clean_body as string | null, rn2?.title ?? null, sums2 ?? null);
          if (!err) auto_enriched += 1;
        }
      }
    }

    if (err) {
      skipped.push({ id, reason: err });
      continue;
    }
    toPublish.push(id);
  }

  if (toPublish.length === 0) {
    return NextResponse.json({
      ok: true,
      updated: 0,
      skipped: skipped.length,
      skipped_samples: skipped.slice(0, 8),
      message:
        skipped.length > 0
          ? '품질 기준을 통과한 초안이 없습니다. LLM이 꺼져 있거나 재가공 후에도 기준이 안 맞으면 수동 확인이 필요합니다.'
          : '승인할 뉴스 초안이 없습니다.',
    });
  }

  const { error: upErr } = await admin.from('processed_news').update({ published: true }).in('id', toPublish);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  revalidatePath('/', 'layout');
  revalidatePath('/news');
  for (const id of toPublish) {
    void requestGoogleIndexing(absoluteUrl(`/news/${id}`));
  }
  return NextResponse.json({
    ok: true,
    updated: toPublish.length,
    skipped: skipped.length,
    skipped_samples: skipped.slice(0, 8),
    auto_enriched,
  });
}
