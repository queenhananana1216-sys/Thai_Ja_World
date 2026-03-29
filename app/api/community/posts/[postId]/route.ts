/**
 * PATCH — 작성자만 author_hidden 토글
 * DELETE — 작성자만 행 삭제 (댓글·반응은 FK cascade)
 */
import { NextResponse } from 'next/server';
import { verifyBearerOwnsPost } from '@/lib/community/verifyPostAuthor';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ postId: string }> };

function bearer(req: Request): string {
  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m?.[1]?.trim() ?? '';
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { postId } = await ctx.params;
  if (!postId) {
    return NextResponse.json({ code: 'invalid' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: 'invalid_json' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const authorHidden = b.author_hidden;
  if (typeof authorHidden !== 'boolean') {
    return NextResponse.json({ code: 'invalid' }, { status: 400 });
  }

  const v = await verifyBearerOwnsPost(bearer(req), postId);
  if (!v.ok) {
    return NextResponse.json({ code: v.code }, { status: v.status });
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ code: 'server', message: msg }, { status: 503 });
  }

  const { error } = await admin.from('posts').update({ author_hidden: authorHidden }).eq('id', postId);
  if (error) {
    return NextResponse.json({ code: 'server', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, author_hidden: authorHidden });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { postId } = await ctx.params;
  if (!postId) {
    return NextResponse.json({ code: 'invalid' }, { status: 400 });
  }

  const v = await verifyBearerOwnsPost(bearer(req), postId);
  if (!v.ok) {
    return NextResponse.json({ code: v.code }, { status: v.status });
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ code: 'server', message: msg }, { status: 503 });
  }

  const { error } = await admin.from('posts').delete().eq('id', postId);
  if (error) {
    return NextResponse.json({ code: 'server', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
