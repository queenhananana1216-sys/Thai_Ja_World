/**
 * GET /api/boards — 공개 목록 (anon RLS)
 * POST /api/boards — 작성 (Bearer); 성공 후 퀘스트 RPC 연동
 */
import { NextResponse } from 'next/server';
import { parseBoardPostBody } from './boardPayload';
import { recordQuestProgress } from '@/lib/quests/progress';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bearer(req: Request): string {
  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m?.[1]?.trim() ?? '';
}

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const boardType = url.searchParams.get('board_type')?.trim();
  const limitRaw = Number(url.searchParams.get('limit') ?? '30');
  const offsetRaw = Number(url.searchParams.get('offset') ?? '0');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 30;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

  const sb = createServerClient();
  let query = sb
    .from('board_posts')
    .select(
      'id,user_id,board_type,title,content,image_urls,lat,lng,address,created_at,updated_at',
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (boardType === 'free' || boardType === 'info') {
    query = query.eq('board_type', boardType);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [], limit, offset });
}

export async function POST(req: Request): Promise<NextResponse> {
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
    .insert({
      user_id: user.id,
      board_type: payload.board_type,
      title: payload.title,
      content: payload.content,
      image_urls: payload.image_urls,
      lat: payload.lat,
      lng: payload.lng,
      address: payload.address,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const postId = data?.id;
  if (!postId) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  try {
    const dayKey = new Date().toISOString().slice(0, 10);
    if (payload.board_type === 'info') {
      await recordQuestProgress({
        profileId: user.id,
        eventType: 'local_info_share',
        amount: 1,
        source: 'board_posts_create',
        dedupeKey: `local_info_share:${user.id}:${dayKey}`,
        metadata: { board_post_id: postId },
      });
    } else {
      await recordQuestProgress({
        profileId: user.id,
        eventType: 'write_post',
        amount: 1,
        source: 'board_posts_create',
        dedupeKey: `board_post:${postId}`,
        metadata: { board_post_id: postId },
      });
    }
  } catch {
    // 퀘스트 실패는 글 등록 성공에 영향 없음
  }

  return NextResponse.json({ id: postId });
}
