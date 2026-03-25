/**
 * POST /api/news/comments
 * Authorization: Bearer <access_token>
 * Body: { processed_news_id, content }
 */
import { NextResponse } from 'next/server';
import { createModeratedNewsComment } from '@/lib/moderation/newsCommentSubmissionPipeline';
import { boardModMessage } from '@/lib/community/moderationMessages';
import { getDictionary } from '@/i18n/dictionaries';

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
  const processedNewsId = typeof b.processed_news_id === 'string' ? b.processed_news_id : '';
  const content = typeof b.content === 'string' ? b.content : '';

  if (!processedNewsId) {
    return NextResponse.json({ code: 'invalid' }, { status: 400 });
  }

  const result = await createModeratedNewsComment(token, processedNewsId, content);
  if (result.ok) {
    return NextResponse.json({ ok: true });
  }

  const labels = getDictionary('ko').board;
  const message =
    result.message?.trim() ||
    (result.code ? boardModMessage(labels, result.code as Parameters<typeof boardModMessage>[1]) : undefined);

  return NextResponse.json(
    { code: result.code, message: message ?? null },
    { status: result.status },
  );
}
