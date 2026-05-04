/**
 * POST /api/bot/post-insight-engine
 * 커뮤니티 posts.ai_insight 배치(또는 단일 postId) — Bearer CRON_SECRET
 */
import { type NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isCronAuthorized } from '@/lib/cronAuth';
import { retrofitPostInsightBatch, runPostInsightForId } from '@/bots/actions/postInsightEngine';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: Record<string, unknown> = {};
  try {
    const t = await req.text();
    if (t.trim()) rawBody = JSON.parse(t) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ status: 'error', error: 'Invalid JSON body' }, { status: 400 });
  }

  const postIdRaw = rawBody.postId;
  if (typeof postIdRaw === 'string' && postIdRaw.trim()) {
    const r = await runPostInsightForId(postIdRaw.trim());
    if (!r.ok) {
      return NextResponse.json({ status: 'error', error: r.error ?? 'failed' }, { status: 400 });
    }
    revalidatePath('/community/boards', 'layout');
    revalidatePath(`/community/boards/${postIdRaw.trim()}`);
    return NextResponse.json({ status: 'ok', mode: 'single', postId: postIdRaw.trim() });
  }

  const limRaw = rawBody.limit;
  const limit =
    typeof limRaw === 'number' && Number.isFinite(limRaw)
      ? Math.floor(limRaw)
      : typeof limRaw === 'string'
        ? Number.parseInt(limRaw, 10)
        : 12;
  const onlyMissing = rawBody.onlyMissing !== false;

  try {
    const result = await retrofitPostInsightBatch({
      limit: Number.isFinite(limit) ? limit : 12,
      onlyMissing,
    });
    if (result.ok > 0) {
      revalidatePath('/community/boards', 'layout');
      revalidatePath('/', 'layout');
    }
    return NextResponse.json({ status: 'ok', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[post-insight-engine]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
