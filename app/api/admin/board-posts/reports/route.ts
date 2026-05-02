/**
 * POST /api/admin/board-posts/reports — 검증 제보 글 작성 (service role + 오너 세션)
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

export async function POST(req: Request): Promise<NextResponse> {
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
    return NextResponse.json(
      { error: 'MISSING_SERVICE_ROLE', code: 'MISSING_SERVICE_ROLE' },
      { status: 503 },
    );
  }

  const admin = createServiceRoleClient();
  const { data: insertedRows, error } = await admin
    .from('board_posts')
    .insert({
      user_id: user.id,
      board_type: 'reports',
      title,
      content,
      image_urls,
      lat: null,
      lng: null,
      address: null,
    })
    .select('id');

  if (error) {
    logSupabaseWriteFailure('api/admin/board-posts/reports POST board_posts.insert', {
      message: error.message,
      code: error.code,
    });
    const { status, body: errBody } = jsonBodyForBoardWriteVerbose({
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(errBody, { status });
  }

  const id = insertedRows?.[0]?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  revalidatePath('/boards');
  revalidatePath(`/boards/${id}`);
  return NextResponse.json({ ok: true, id });
}
