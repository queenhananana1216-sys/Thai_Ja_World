/**
 * POST /api/community/comments
 * Authorization: Bearer <access_token>
 * Body: { post_id, content }
 */
import { NextResponse } from 'next/server';
import { createModeratedComment } from '@/lib/moderation/commentSubmissionPipeline';
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
  const postId = typeof b.post_id === 'string' ? b.post_id : '';
  const content = typeof b.content === 'string' ? b.content : '';

  if (!postId) {
    return NextResponse.json({ code: 'invalid' }, { status: 400 });
  }

  const result = await createModeratedComment(token, postId, content);
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
          source: 'community_comment_create',
          dedupeKey: `community_comment:${postId}:${Date.now()}`,
          metadata: { post_id: postId, kind: 'comment' },
        });
      }
    } catch {
      // no-op
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { code: result.code, message: result.message ?? null },
    { status: result.status },
  );
}
