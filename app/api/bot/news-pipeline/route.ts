/**
 * POST /api/bot/news-pipeline
 *
 * RSS 수집(NEWS_RSS_URLS) → raw_news 저장 → 미처리 건에 대해 OpenAI로 한국어·태국어 제목·요약(processed_news).
 *
 * Body (JSON, 모두 선택):
 * { "itemsPerFeed": 10, "limit": 8, "skipCollect": true, "skipProcess": true,
 *   "collectIdempotencyKey": "...", "processIdempotencyKey": "..." }
 *
 * skipCollect / skipProcess 로 수집만 또는 번역·요약만 실행 가능(주간 배치 나누기).
 *
 * 보안: CRON_SECRET 또는 BOT_CRON_SECRET 이 설정되면 Authorization: Bearer <동일값> 필요.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runNewsIngestPipeline } from '@/bots/orchestrator/runNewsIngestPipeline';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_ITEMS = 50;
const MAX_LIMIT = 30;

function validateBody(raw: unknown): {
  collect?: { itemsPerFeed?: number; idempotencyKey?: string };
  process?: { limit?: number; idempotencyKey?: string };
  skipCollect?: boolean;
  skipProcess?: boolean;
  error?: string;
} {
  if (raw !== null && typeof raw !== 'object') {
    return { error: 'Request body must be a JSON object.' };
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const out: {
    collect?: { itemsPerFeed?: number; idempotencyKey?: string };
    process?: { limit?: number; idempotencyKey?: string };
    skipCollect?: boolean;
    skipProcess?: boolean;
  } = {};

  if (body.skipCollect !== undefined) {
    if (typeof body.skipCollect !== 'boolean') {
      return { error: 'skipCollect must be a boolean.' };
    }
    out.skipCollect = body.skipCollect;
  }
  if (body.skipProcess !== undefined) {
    if (typeof body.skipProcess !== 'boolean') {
      return { error: 'skipProcess must be a boolean.' };
    }
    out.skipProcess = body.skipProcess;
  }

  const itemsPerFeed = body.itemsPerFeed;
  if (itemsPerFeed !== undefined) {
    if (typeof itemsPerFeed !== 'number' || !Number.isFinite(itemsPerFeed)) {
      return { error: 'itemsPerFeed must be a finite number.' };
    }
    const n = Math.floor(itemsPerFeed);
    if (n < 1 || n > MAX_ITEMS) {
      return { error: `itemsPerFeed must be between 1 and ${MAX_ITEMS}.` };
    }
    out.collect = { ...out.collect, itemsPerFeed: n };
  }

  const limit = body.limit;
  if (limit !== undefined) {
    if (typeof limit !== 'number' || !Number.isFinite(limit)) {
      return { error: 'limit must be a finite number.' };
    }
    const n = Math.floor(limit);
    if (n < 1 || n > MAX_LIMIT) {
      return { error: `limit must be between 1 and ${MAX_LIMIT}.` };
    }
    out.process = { ...out.process, limit: n };
  }

  const ck = body.collectIdempotencyKey;
  if (ck !== undefined) {
    if (typeof ck !== 'string' || ck.length === 0 || ck.length > 128) {
      return { error: 'collectIdempotencyKey must be a non-empty string (max 128).' };
    }
    out.collect = { ...out.collect, idempotencyKey: ck };
  }

  const pk = body.processIdempotencyKey;
  if (pk !== undefined) {
    if (typeof pk !== 'string' || pk.length === 0 || pk.length > 128) {
      return { error: 'processIdempotencyKey must be a non-empty string (max 128).' };
    }
    out.process = { ...out.process, idempotencyKey: pk };
  }

  return out;
}

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

  const v = validateBody(rawBody);
  if (v.error) {
    return NextResponse.json({ status: 'error', error: v.error }, { status: 400 });
  }

  try {
    const { collect: collectRun, process: summarizeRun } = await runNewsIngestPipeline({
      skipCollect: v.skipCollect,
      skipProcess: v.skipProcess,
      collect: v.collect,
      process: v.process,
    });

    return NextResponse.json({
      status: 'ok',
      collect: collectRun,
      process: summarizeRun,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/news-pipeline]', message);
    return NextResponse.json({ status: 'error', error: 'Internal Server Error' }, { status: 500 });
  }
}
