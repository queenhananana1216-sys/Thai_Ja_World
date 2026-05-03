/**
 * POST /api/bot/insight-engine-retrofit
 *
 * `processed_news` 를 `raw_news` 원문으로 이중언어 LLM 재가공(인사이트·대비책·ai_signals 16키 스키마).
 * 한 요청당 최대 25건(LLM·타임아웃). 전체 소진은 Cron 또는 스크립트로 반복 호출.
 *
 * Body JSON (선택):
 * - limit: 1~25 (기본 12)
 * - onlyMissing: true면 인사이트·ai_signals 불완전 행만 (기본 true). false면 통과 게이트 행도 전면 재실행.
 * - skipTipsArticles: false면 tips_articles 동기화(기본 true — 꿀팁 테이블 덮어쓰기 방지).
 *
 * 보안: CRON_SECRET / BOT_CRON_SECRET — Authorization: Bearer
 */
import { type NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { retrofitInsightEngineProcessedNewsBatch } from '@/bots/actions/summarizeAndPersistNews';
import { isCronAuthorized } from '@/lib/cronAuth';

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

  const limRaw = rawBody.limit;
  const limit =
    typeof limRaw === 'number' && Number.isFinite(limRaw)
      ? Math.floor(limRaw)
      : typeof limRaw === 'string'
        ? Number.parseInt(limRaw, 10)
        : 12;
  const onlyMissing = rawBody.onlyMissing !== false;
  const skipTipsArticles = rawBody.skipTipsArticles !== false;

  try {
    const result = await retrofitInsightEngineProcessedNewsBatch({
      limit: Number.isFinite(limit) ? limit : 12,
      onlyMissing,
      skipTipsArticles,
    });
    if (result.ok > 0) {
      revalidatePath('/', 'layout');
      revalidatePath('/news');
      revalidatePath('/admin/news');
    }
    return NextResponse.json({ status: 'ok', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[insight-engine-retrofit]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
