/**
 * POST /api/bot/collect
 *
 * Request Body (JSON, 모두 선택):
 * {
 *   "idempotencyKey": "daily-news-2026-03-23",
 *   "itemsPerFeed": 10
 * }
 *
 * 피드 URL 은 환경 변수 NEWS_RSS_URLS (쉼표 구분) 에서만 읽습니다.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runCollectLoop, type RunCollectLoopOptions } from '@/bots/orchestrator/runCollectLoop';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';

const MAX_KEY_LENGTH = 128;
const MAX_ITEMS = 50;

function validateBody(raw: unknown): { options: RunCollectLoopOptions; error?: never } | { options?: never; error: string } {
  if (raw !== null && typeof raw !== 'object') {
    return { error: 'Request body must be a JSON object.' };
  }

  const body = (raw ?? {}) as Record<string, unknown>;

  const idempotencyKey = body.idempotencyKey;
  if (idempotencyKey !== undefined) {
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
      return { error: 'idempotencyKey must be a non-empty string.' };
    }
    if (idempotencyKey.length > MAX_KEY_LENGTH) {
      return { error: `idempotencyKey must not exceed ${MAX_KEY_LENGTH} characters.` };
    }
  }

  const itemsPerFeed = body.itemsPerFeed;
  if (itemsPerFeed !== undefined) {
    if (typeof itemsPerFeed !== 'number' || !Number.isFinite(itemsPerFeed)) {
      return { error: 'itemsPerFeed must be a finite number.' };
    }
    if (itemsPerFeed < 1 || itemsPerFeed > MAX_ITEMS) {
      return { error: `itemsPerFeed must be between 1 and ${MAX_ITEMS}.` };
    }
  }

  return {
    options: {
      idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
      itemsPerFeed: typeof itemsPerFeed === 'number' ? Math.floor(itemsPerFeed) : undefined,
    },
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: unknown = {};
  try {
    const text = await req.text();
    if (text.trim().length > 0) {
      rawBody = JSON.parse(text);
    }
  } catch {
    return NextResponse.json(
      { status: 'error', error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  const validation = validateBody(rawBody);
  if (validation.error) {
    return NextResponse.json({ status: 'error', error: validation.error }, { status: 400 });
  }

  try {
    const result = await runCollectLoop(validation.options);

    if (result.skipped) {
      return NextResponse.json({ status: 'skipped', run_id: result.run_id }, { status: 200 });
    }

    if (!result.success) {
      return NextResponse.json(
        {
          status: 'error',
          run_id: result.run_id,
          error: result.error,
          output: result.output,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { status: 'ok', run_id: result.run_id, output: result.output },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/collect] Unhandled error:', message);
    // 디버깅용: 로컬에서 500 원인을 바로 확인할 수 있게 메시지 노출
    return NextResponse.json(
      { status: 'error', error: message },
      { status: 500 },
    );
  }
}
