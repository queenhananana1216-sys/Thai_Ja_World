/**
 * PATCH — 작성자: author_hidden, 제목·본문 수정 (글 비밀번호 설정 시 함께 검증)
 * DELETE — 작성자 또는 관리자. 글 비밀번호가 있으면 작성자는 본문에 비밀번호 포함
 */
import { NextResponse } from 'next/server';
import { isAdminActorEmail } from '@/lib/admin/adminAllowedEmails';
import { verifyPostOwnerGate } from '@/lib/community/verifyPostOwnerGate';
import { verifyBearerOwnsPost } from '@/lib/community/verifyPostAuthor';
import { moderatePostContent } from '@/lib/moderation/openaiModeration';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ postId: string }> };

function bearer(req: Request): string {
  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m?.[1]?.trim() ?? '';
}

async function parseJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const t = await req.text();
    if (!t.trim()) return {};
    const o = JSON.parse(t) as unknown;
    return o !== null && typeof o === 'object' ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { postId } = await ctx.params;
  if (!postId) {
    return NextResponse.json({ code: 'invalid' }, { status: 400 });
  }

  const b = await parseJsonBody(req);
  const authorHidden = b.author_hidden;
  const titleIn = b.title;
  const contentIn = b.content;
  const ownerPassword = typeof b.owner_password === 'string' ? b.owner_password : undefined;

  const hasHidden = typeof authorHidden === 'boolean';
  const hasTitle = typeof titleIn === 'string';
  const hasContent = typeof contentIn === 'string';
  if (!hasHidden && !hasTitle && !hasContent) {
    return NextResponse.json({ code: 'invalid', error: 'no_updates' }, { status: 400 });
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

  const gate = await verifyPostOwnerGate(admin, postId, ownerPassword);
  if (gate === 'gate_db_error') {
    return NextResponse.json({ code: 'server' }, { status: 500 });
  }
  if (gate === 'password_required') {
    return NextResponse.json({ code: 'owner_password_required' }, { status: 403 });
  }
  if (gate === 'password_invalid') {
    return NextResponse.json({ code: 'owner_password_invalid' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};

  if (hasHidden) {
    updates.author_hidden = authorHidden;
  }

  if (hasTitle || hasContent) {
    const { data: row, error: qErr } = await admin
      .from('posts')
      .select('title, content, image_urls')
      .eq('id', postId)
      .maybeSingle();
    if (qErr || !row) {
      return NextResponse.json({ code: 'not_found' }, { status: 404 });
    }

    const nextTitle = hasTitle ? String(titleIn).trim() : String((row as { title: string }).title ?? '');
    const nextContent = hasContent
      ? String(contentIn).trim()
      : String((row as { content: string }).content ?? '');
    const imgs = Array.isArray((row as { image_urls: unknown }).image_urls)
      ? ((row as { image_urls: string[] }).image_urls as string[])
      : [];

    if (nextTitle.length < 1 || nextTitle.length > 200 || nextContent.length < 2) {
      return NextResponse.json({ code: 'invalid' }, { status: 400 });
    }

    const ai = await moderatePostContent(nextTitle, nextContent, imgs);
    if ('error' in ai && ai.error === 'IMAGE_REQUIRES_OPENAI') {
      return NextResponse.json({ code: 'imagePolicy' }, { status: 422 });
    }
    if ('error' in ai && ai.error) {
      return NextResponse.json(
        { code: 'server', message: ai.detail ?? ai.error },
        { status: 503 },
      );
    }
    if ('flagged' in ai && ai.flagged) {
      return NextResponse.json({ code: 'nsfw' }, { status: 422 });
    }

    updates.title = nextTitle.slice(0, 200);
    updates.content = nextContent;
  }

  const { error } = await admin.from('posts').update(updates).eq('id', postId);
  if (error) {
    return NextResponse.json({ code: 'server', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { postId } = await ctx.params;
  if (!postId) {
    return NextResponse.json({ code: 'invalid' }, { status: 400 });
  }

  const b = await parseJsonBody(req);
  const ownerPassword = typeof b.owner_password === 'string' ? b.owner_password : undefined;

  const token = bearer(req);
  if (!token) {
    return NextResponse.json({ code: 'auth' }, { status: 401 });
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ code: 'server', message: msg }, { status: 503 });
  }

  const { data: row, error: qErr } = await admin.from('posts').select('author_id').eq('id', postId).maybeSingle();
  if (qErr || !row) {
    return NextResponse.json({ code: 'not_found' }, { status: 404 });
  }
  const authorId = String((row as { author_id: string }).author_id);

  let userId: string;
  let userEmail: string | undefined;
  try {
    const sb = createSupabaseWithUserJwt(token);
    const { data: u, error: ue } = await sb.auth.getUser();
    if (ue || !u.user) {
      return NextResponse.json({ code: 'auth' }, { status: 401 });
    }
    userId = u.user.id;
    userEmail = u.user.email ?? undefined;
  } catch {
    return NextResponse.json({ code: 'auth' }, { status: 401 });
  }

  const isAuthor = userId === authorId;
  const isAdmin = isAdminActorEmail(userEmail);
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ code: 'forbidden' }, { status: 403 });
  }

  if (isAuthor && !isAdmin) {
    const gate = await verifyPostOwnerGate(admin, postId, ownerPassword);
    if (gate === 'gate_db_error') {
      return NextResponse.json({ code: 'server' }, { status: 500 });
    }
    if (gate === 'password_required') {
      return NextResponse.json({ code: 'owner_password_required' }, { status: 403 });
    }
    if (gate === 'password_invalid') {
      return NextResponse.json({ code: 'owner_password_invalid' }, { status: 403 });
    }
  }

  const { error } = await admin.from('posts').delete().eq('id', postId);
  if (error) {
    return NextResponse.json({ code: 'server', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
