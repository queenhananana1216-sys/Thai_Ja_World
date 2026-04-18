/**
 * POST /api/community/reactions — 좋아요/공감 토글
 * GET  /api/community/reactions?post_id=... — 카운트 + 현재 사용자의 liked 상태
 *
 * Authorization: Bearer <access_token> (POST에서 필요)
 */
import { NextResponse } from 'next/server';
import { recordQuestProgress } from '@/lib/quests/progress';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

const ALLOWED_KINDS = new Set(['like', 'heart']);

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m?.[1]?.trim() ?? null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const postId = url.searchParams.get('post_id');
  if (!postId) {
    return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
  }

  const sb = createServerClient();

  const { count: likeCount } = await sb
    .from('post_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('kind', 'like');
  const { count: heartCount } = await sb
    .from('post_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('kind', 'heart');

  let liked = { like: false, heart: false };
  const token = getBearerToken(req);
  if (token) {
    const userSb = createSupabaseWithUserJwt(token);
    const {
      data: { user },
    } = await userSb.auth.getUser();

    if (user) {
      const likeRow = await userSb
        .from('post_reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .eq('kind', 'like')
        .maybeSingle();
      const heartRow = await userSb
        .from('post_reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .eq('kind', 'heart')
        .maybeSingle();

      liked = {
        like: Boolean(likeRow.data),
        heart: Boolean(heartRow.data),
      };
    }
  }

  return NextResponse.json({
    post_id: postId,
    like_count: likeCount ?? 0,
    heart_count: heartCount ?? 0,
    liked,
  });
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const postId = typeof b.post_id === 'string' ? b.post_id.trim() : '';
  const kind = typeof b.kind === 'string' ? b.kind.trim() : '';
  if (!postId) return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
  if (!ALLOWED_KINDS.has(kind)) return NextResponse.json({ error: 'invalid kind' }, { status: 400 });

  const userSb = createSupabaseWithUserJwt(token);
  const {
    data: { user },
    error: userErr,
  } = await userSb.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // banned_until 체크
  const { data: prof, error: profErr } = await userSb
    .from('profiles')
    .select('banned_until')
    .eq('id', user.id)
    .maybeSingle();
  if (profErr) {
    return NextResponse.json({ error: 'profile fetch failed' }, { status: 500 });
  }
  if (prof?.banned_until && new Date(prof.banned_until).getTime() > Date.now()) {
    return NextResponse.json({ error: 'banned' }, { status: 403 });
  }

  // existing?
  const { data: existing, error: exErr } = await userSb
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .eq('kind', kind)
    .maybeSingle();
  if (exErr) {
    return NextResponse.json({ error: exErr.message }, { status: 500 });
  }

  if (existing) {
    const { error: delErr } = await userSb
      .from('post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .eq('kind', kind);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  } else {
    const { error: insErr } = await userSb.from('post_reactions').insert({
      post_id: postId,
      user_id: user.id,
      kind,
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    await recordQuestProgress({
      profileId: user.id,
      eventType: 'send_reaction',
      amount: 1,
      source: 'community_reaction',
      dedupeKey: `post_reaction:${postId}:${kind}:${user.id}`,
      metadata: { post_id: postId, kind },
    });
  }

  // counts
  const sb = createServerClient();
  const { count: likeCount } = await sb
    .from('post_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('kind', 'like');
  const { count: heartCount } = await sb
    .from('post_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('kind', 'heart');

  const likeRow = await userSb
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .eq('kind', 'like')
    .maybeSingle();
  const heartRow = await userSb
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .eq('kind', 'heart')
    .maybeSingle();

  return NextResponse.json({
    post_id: postId,
    like_count: likeCount ?? 0,
    heart_count: heartCount ?? 0,
    liked: {
      like: Boolean(likeRow.data),
      heart: Boolean(heartRow.data),
    },
  });
}

