/**
 * GET /api/boards — 공개 목록 (anon RLS)
 * POST /api/boards — 작성 (Bearer); 성공 후 미션 RPC 연동
 */
import { NextResponse } from 'next/server';
import { parseBoardPostBody } from './boardPayload';
import { publicBodyFromSupabaseMessage } from '@/lib/db/dbErrorDefense';
import { recordQuestProgress } from '@/lib/quests/progress';
import { createServiceRoleClient } from '@/lib/supabase/admin';
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
    const { status, body } = publicBodyFromSupabaseMessage(error.message);
    return NextResponse.json(body, { status });
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

  /** SECURITY DEFINER RPC — PostgREST `board_posts` 직접 INSERT 스키마 캐시 불일치 회피 */
  const admin = createServiceRoleClient();
  const { data: postId, error } = await admin.rpc('board_posts_insert_for_service', {
    p_user_id: user.id,
    p_board_type: payload.board_type,
    p_title: payload.title,
    p_content: payload.content,
    p_image_urls: payload.image_urls,
    p_lat: payload.lat,
    p_lng: payload.lng,
    p_address: payload.address,
  });

  if (error) {
    console.error('[api/boards POST] board_posts_insert_for_service:', error.message);
    const { status, body } = publicBodyFromSupabaseMessage(error.message);
    return NextResponse.json(body, { status });
  }
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
    // 미션 실패는 글 등록 성공에 영향 없음
  }

  return NextResponse.json({ id: postId });
}
