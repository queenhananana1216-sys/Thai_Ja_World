/**
 * PUT /api/boards/[id] — 본인 글 수정
 * DELETE /api/boards/[id] — 본인 글 삭제
 */
import { NextResponse } from 'next/server';
import { parseBoardPostBody } from '../boardPayload';
import { jsonBodyForBoardWriteVerbose, logSupabaseWriteFailure } from '@/lib/db/dbErrorDefense';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

function bearer(req: Request): string {
  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m?.[1]?.trim() ?? '';
}

export async function PUT(req: Request, ctx: Ctx): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const token = bearer(req);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const raw = body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const parsed = parseBoardPostBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { payload } = parsed;
  const sb = createSupabaseWithUserJwt(token);
  const {
    data: { user },
    error: userError,
  } = await sb.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      {
        error: '서버 Supabase 서비스 롤 키가 없어 수정할 수 없습니다.',
        code: 'MISSING_SERVICE_ROLE',
        supabase_message: 'MISSING_SERVICE_ROLE',
      },
      { status: 503 },
    );
  }

  const admin = createServiceRoleClient();
  const { data: updatedRow, error } = await admin
    .from('board_posts')
    .update({
      title: payload.title,
      content: payload.content,
      image_urls: payload.image_urls,
      lat: payload.lat,
      lng: payload.lng,
      address: payload.address,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    logSupabaseWriteFailure('api/boards PUT board_posts.update', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    const { status, body } = jsonBodyForBoardWriteVerbose({
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(body, { status });
  }
  if (!updatedRow?.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: updatedRow.id });
}

export async function DELETE(req: Request, ctx: Ctx): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const token = bearer(req);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = createSupabaseWithUserJwt(token);
  const {
    data: { user },
    error: userError,
  } = await sb.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      {
        error: '서버 Supabase 서비스 롤 키가 없어 삭제할 수 없습니다.',
        code: 'MISSING_SERVICE_ROLE',
        supabase_message: 'MISSING_SERVICE_ROLE',
      },
      { status: 503 },
    );
  }

  const admin = createServiceRoleClient();
  const { data: deletedRows, error } = await admin
    .from('board_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id');

  if (error) {
    logSupabaseWriteFailure('api/boards DELETE board_posts.delete', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    const { status, body } = jsonBodyForBoardWriteVerbose({
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(body, { status });
  }
  if (!deletedRows?.length) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
