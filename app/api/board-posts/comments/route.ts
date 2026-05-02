/**
 * POST /api/board-posts/comments — board_posts(reports) 댓글
 * Body: { board_post_id, content, parent_comment_id? }
 */
import { NextResponse } from 'next/server';
import { createModeratedBoardPostComment } from '@/lib/moderation/commentSubmissionPipeline';

export const runtime = 'nodejs';

function bearer(req: Request): string {
  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m?.[1]?.trim() ?? '';
}

export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) {
    return NextResponse.json({ code: 'auth', error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: 'invalid', error: 'invalid_json' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const boardPostId = typeof b.board_post_id === 'string' ? b.board_post_id.trim() : '';
  const content = typeof b.content === 'string' ? b.content : '';
  const parentCommentId =
    typeof b.parent_comment_id === 'string' && b.parent_comment_id.trim()
      ? b.parent_comment_id.trim()
      : null;

  if (!boardPostId) {
    return NextResponse.json({ code: 'invalid' }, { status: 400 });
  }

  const result = await createModeratedBoardPostComment(token, boardPostId, content, parentCommentId);
  if (result.ok) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { code: result.code, message: result.message ?? null },
    { status: result.status },
  );
}
