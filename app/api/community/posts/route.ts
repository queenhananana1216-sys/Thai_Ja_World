/**
 * POST /api/community/posts
 * Authorization: Bearer <supabase access_token>
 * Body: { category, title, content, image_urls: string[] }
 * 게시글은 service role로만 INSERT (모더레이션·벤 후)
 */
import { NextResponse } from 'next/server';
import { createModeratedPost } from '@/lib/moderation/postSubmissionPipeline';
import { recordQuestProgress } from '@/lib/quests/progress';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';

export async function POST(req: Request) {
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
      // 퀘스트 누적 실패는 게시글 생성 성공을 막지 않는다.
    }
    return NextResponse.json({ id: result.postId });
  }

  return NextResponse.json(
    { code: result.code, message: result.message ?? null },
    { status: result.status },
  );
}
