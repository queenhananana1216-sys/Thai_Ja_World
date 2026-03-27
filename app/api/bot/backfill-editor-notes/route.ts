/**
 * POST /api/bot/backfill-editor-notes
 *
 * 최근 N일 이내 생성된 processed_news 중 clean_body 에 editor_note 가 비어 있는 행에
 * 편집실 한마디(ko/th)를 LLM으로 채워 넣습니다.
 *
 * Body (선택): { "days": 7, "limit": 40 }
 *
 * 보안: CRON_SECRET / BOT_CRON_SECRET 설정 시 Authorization: Bearer 필요.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { backfillProcessedNewsEditorNotes } from '@/bots/actions/summarizeAndPersistNews';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_DAYS = 30;
const MAX_LIMIT = 60;

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
  let days = 7;
  let limit = 40;

  if (body.days !== undefined) {
    if (typeof body.days !== 'number' || !Number.isFinite(body.days)) {
      return NextResponse.json({ status: 'error', error: 'days must be a finite number.' }, { status: 400 });
    }
    days = Math.min(MAX_DAYS, Math.max(1, Math.floor(body.days)));
  }
  if (body.limit !== undefined) {
    if (typeof body.limit !== 'number' || !Number.isFinite(body.limit)) {
      return NextResponse.json({ status: 'error', error: 'limit must be a finite number.' }, { status: 400 });
    }
    limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(body.limit)));
  }

  try {
    const result = await backfillProcessedNewsEditorNotes(days, limit);
    return NextResponse.json({ status: 'ok', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/backfill-editor-notes]', message);
    return NextResponse.json({ status: 'error', error: 'Internal Server Error' }, { status: 500 });
  }
}
