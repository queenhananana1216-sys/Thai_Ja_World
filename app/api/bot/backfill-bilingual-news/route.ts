/**
 * POST /api/bot/backfill-bilingual-news
 *
 * clean_body 에 유효한 th 제목·요약이 없는 processed_news 를 최신순으로 골라 삭제한 뒤,
 * summarizeAndPersistNewsBatch 로 한국어·태국어 요약을 다시 만듭니다.
 *
 * Body (선택): { "deleteMax": 15, "summarizeLimit": 15 }
 *
 * 보안: CRON_SECRET / BOT_CRON_SECRET 설정 시 Authorization: Bearer 필요.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { backfillBilingualProcessedNews } from '@/bots/actions/backfillBilingualProcessedNews';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_DELETE = 100;
const MAX_SUM = 30;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: unknown = {};
  try {
    const text = await req.text();
    if (text.trim().length > 0) rawBody = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { status: 'error', error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  const body = (rawBody ?? {}) as Record<string, unknown>;
  let deleteMax = 15;
  let summarizeLimit = 15;

  if (body.deleteMax !== undefined) {
    if (typeof body.deleteMax !== 'number' || !Number.isFinite(body.deleteMax)) {
      return NextResponse.json(
        { status: 'error', error: 'deleteMax must be a finite number.' },
        { status: 400 },
      );
    }
    deleteMax = Math.min(MAX_DELETE, Math.max(1, Math.floor(body.deleteMax)));
  }
  if (body.summarizeLimit !== undefined) {
    if (typeof body.summarizeLimit !== 'number' || !Number.isFinite(body.summarizeLimit)) {
      return NextResponse.json(
        { status: 'error', error: 'summarizeLimit must be a finite number.' },
        { status: 400 },
      );
    }
    summarizeLimit = Math.min(MAX_SUM, Math.max(1, Math.floor(body.summarizeLimit)));
  }

  try {
    const result = await backfillBilingualProcessedNews(deleteMax, summarizeLimit);
    return NextResponse.json({ status: 'ok', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/backfill-bilingual-news]', message);
    return NextResponse.json({ status: 'error', error: 'Internal Server Error' }, { status: 500 });
  }
}
