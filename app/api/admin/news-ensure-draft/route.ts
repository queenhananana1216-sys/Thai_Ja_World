/**
 * raw_news 만 있고 processed_news 가 없을 때 스텁 초안(published=false) 생성 — 관리자 전용
 */
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { ensureNewsDraftFromRawNewsId } from '@/bots/actions/summarizeAndPersistNews';
import { getServerSupabaseClient } from '@/bots/adapters/supabaseClient';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

function allowedActor(email: string | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const list = parseAdminAllowedEmails();
  if (list.length === 0) return true;
  return list.includes(e);
}

async function listOrphanRawNewsIds(maxPick: number): Promise<string[]> {
  const client = getServerSupabaseClient();
  const { data: processedRows, error: pe } = await client.from('processed_news').select('raw_news_id');
  if (pe) return [];
  const done = new Set((processedRows ?? []).map((r) => String(r.raw_news_id)));
  const { data: rawRows, error: re } = await client
    .from('raw_news')
    .select('id')
    .order('fetched_at', { ascending: false })
    .limit(400);
  if (re || !rawRows?.length) return [];
  return rawRows
    .map((r) => String(r.id))
    .filter((rid) => !done.has(rid))
    .slice(0, maxPick);
}

type Body = { raw_news_id?: string; bulk_limit?: number };

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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const single = typeof body.raw_news_id === 'string' ? body.raw_news_id.trim() : '';
  if (single) {
    const r = await ensureNewsDraftFromRawNewsId(single);
    if (!r.ok) {
      const status = r.error?.includes('찾을 수 없') ? 404 : 400;
      return NextResponse.json(r, { status });
    }
    revalidatePath('/admin/news');
    return NextResponse.json(r);
  }

  const lim = Math.min(30, Math.max(1, Math.floor(Number(body.bulk_limit) || 15)));
  const ids = await listOrphanRawNewsIds(lim);
  const results = [];
  for (const id of ids) {
    results.push(await ensureNewsDraftFromRawNewsId(id));
  }
  const created = results.filter((x) => x.ok && !x.already_existed).length;
  const skipped_existing = results.filter((x) => x.already_existed).length;
  const failed = results.filter((x) => !x.ok);
  revalidatePath('/admin/news');
  return NextResponse.json({
    ok: failed.length === 0,
    created,
    skipped_existing,
    attempted: ids.length,
    results,
  });
}
