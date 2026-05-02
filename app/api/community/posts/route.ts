/**
 * POST /api/community/posts
 * (글쓰기 UI는 `/community/boards/new` — 별도 `boards/route.ts` 없음)
 * Authorization: Bearer <supabase access_token>
 * Body: { category, title, content, image_urls: string[] }
 * 게시글은 service role로만 INSERT (모더레이션·벤 후)
 *
 * Node 런타임 고정: Edge 최적화 회피하여 Supabase·모더레이션 파이프라인 안정화.
 */
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createModeratedPost } from '@/lib/moderation/postSubmissionPipeline';
import { recordQuestProgress } from '@/lib/quests/progress';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** anon 금지 — 파이프라인과 동일하게 서비스 롤 키로만 클라이언트 생성 (환경 검증용) */
function createCommunityPostServiceRoleClientOrThrow() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error(
      'community/posts API: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required; NEXT_PUBLIC_SUPABASE_ANON_KEY must not be used for inserts.',
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  try {
    createCommunityPostServiceRoleClientOrThrow();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missingEnv =
      /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL/i.test(msg) ||
      msg.includes('community/posts API');
    return NextResponse.json(
      {
        code: 'server',
        message: msg,
        details: null,
        hint: missingEnv
          ? '서버 환경 변수에 SUPABASE_SERVICE_ROLE_KEY 와 NEXT_PUBLIC_SUPABASE_URL 을 설정하세요. anon 키는 이 라우트에서 사용하지 않습니다.'
          : null,
      },
      { status: 503 },
    );
  }

  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  const token = m?.[1]?.trim() ?? '';

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: 'invalid', error: 'invalid_json' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const result = await createModeratedPost(token, {
    category: typeof b.category === 'string' ? b.category : '',
    title: typeof b.title === 'string' ? b.title : '',
    content: typeof b.content === 'string' ? b.content : '',
    image_urls: Array.isArray(b.image_urls) ? b.image_urls.map((x) => String(x)) : [],
    owner_password: typeof b.owner_password === 'string' ? b.owner_password : undefined,
    latitude: typeof b.latitude === 'number' ? b.latitude : null,
    longitude: typeof b.longitude === 'number' ? b.longitude : null,
    location_name: typeof b.location_name === 'string' ? b.location_name : null,
  });

  if (result.ok) {
    try {
      const sb = createSupabaseWithUserJwt(token);
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user?.id) {
        await recordQuestProgress({
          profileId: user.id,
          eventType: 'write_post',
          amount: 1,
          source: 'community_post_create',
          dedupeKey: `community_post:${result.postId}`,
          metadata: { post_id: result.postId },
        });
      }
    } catch {
      // 미션 누적 실패는 게시글 생성 성공을 막지 않는다.
    }
    return NextResponse.json({ id: result.postId });
  }

  const supabase = result.supabase;
  return NextResponse.json(
    {
      code: result.code,
      message: result.message ?? null,
      /** 토스트·로그용 — message와 동일 계열을 한 필드로 */
      details: supabase?.details ?? null,
      hint: supabase?.hint ?? null,
      ...(supabase
        ? {
            supabase_code: supabase.code ?? null,
            supabase_details: supabase.details ?? null,
            supabase_hint: supabase.hint ?? null,
          }
        : {}),
    },
    { status: result.status },
  );
}
