/**
 * PUT / DELETE — 검증 제보 글 수정·삭제 (오너 전용 + service role)
 */
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { jsonBodyForBoardWriteVerbose, logSupabaseWriteFailure } from '@/lib/db/dbErrorDefense';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { tryCreateServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sessionSb = await tryCreateServerSupabaseAuthClient();
  if (!sessionSb) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const {
    data: { user },
    error: userErr,
  } = await sessionSb.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const raw = body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const content = typeof raw.content === 'string' ? raw.content : '';
  let image_urls: string[] = [];
  if (Array.isArray(raw.image_urls)) {
    image_urls = raw.image_urls.map((x) => String(x).trim()).filter(Boolean).slice(0, 30);
  }

  if (title.length < 1 || title.length > 200) {
    return NextResponse.json({ error: 'invalid_title' }, { status: 400 });
  }
  if (content.length > 50_000) {
    return NextResponse.json({ error: 'content_too_long' }, { status: 400 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: 'MISSING_SERVICE_ROLE' }, { status: 503 });
  }

  const admin = createServiceRoleClient();
  const { data: row, error } = await admin
    .from('board_posts')
    .update({
      title,
      content,
      image_urls,
    })
    .eq('id', id)
    .eq('board_type', 'reports')
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    logSupabaseWriteFailure('api/admin/board-posts/reports PUT', { message: error.message });
    const { status, body: errBody } = jsonBodyForBoardWriteVerbose({ message: error.message });
    return NextResponse.json(errBody, { status });
  }
  if (!row?.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  revalidatePath('/boards');
  revalidatePath(`/boards/${id}`);
  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(_req: Request, ctx: Ctx): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sessionSb = await tryCreateServerSupabaseAuthClient();
  if (!sessionSb) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const {
    data: { user },
    error: userErr,
  } = await sessionSb.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: 'MISSING_SERVICE_ROLE' }, { status: 503 });
  }

  const admin = createServiceRoleClient();
  const { data: deleted, error } = await admin
    .from('board_posts')
    .delete()
    .eq('id', id)
    .eq('board_type', 'reports')
    .eq('user_id', user.id)
    .select('id');

  if (error) {
    logSupabaseWriteFailure('api/admin/board-posts/reports DELETE', { message: error.message });
    const { status, body: errBody } = jsonBodyForBoardWriteVerbose({ message: error.message });
    return NextResponse.json(errBody, { status });
  }
  if (!deleted?.length) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  revalidatePath('/boards');
  return NextResponse.json({ ok: true });
}
