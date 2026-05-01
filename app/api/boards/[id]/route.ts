/**
 * PUT /api/boards/[id] — 본인 글 수정
 * DELETE /api/boards/[id] — 본인 글 삭제
 */
import { NextResponse } from 'next/server';
import { parseBoardPostBody } from '../boardPayload';
import { publicBodyFromSupabaseMessage } from '@/lib/db/dbErrorDefense';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const { data, error } = await sb
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
    const { status, body } = publicBodyFromSupabaseMessage(error.message);
    return NextResponse.json(body, { status });
  }
  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: data.id });
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

  const { data: deleted, error } = await sb
    .from('board_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id');

  if (error) {
    const { status, body } = publicBodyFromSupabaseMessage(error.message);
    return NextResponse.json(body, { status });
  }
  if (!deleted?.length) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
