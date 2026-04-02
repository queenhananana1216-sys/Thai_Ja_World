/**
 * POST /api/community/posts
 * Authorization: Bearer <supabase access_token>
 * Body: { category, title, content, image_urls: string[] }
 * 게시글은 service role로만 INSERT (모더레이션·벤 후)
 */
import { NextResponse } from 'next/server';
import { createModeratedPost } from '@/lib/moderation/postSubmissionPipeline';

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
    return NextResponse.json({ id: result.postId });
  }

  return NextResponse.json(
    { code: result.code, message: result.message ?? null },
    { status: result.status },
  );
}
