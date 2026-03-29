/**
 * POST /api/bot/process-news
 *
 * raw_news 중 아직 processed_news 가 없는 항목을 LLM으로 한국어·태국어 제목·요약을 생성해 저장합니다.
 * 기본(manual·미설정)은 published=false 초안 → /admin/news «홈에 게시». NEWS_PUBLISH_MODE=auto 는 즉시 공개.
 *
 * Body (JSON, 모두 선택):
 * { "limit": 8, "idempotencyKey": "optional-key" }
 *
 * 필요 환경 변수: Supabase service role + 요약용 LLM
 *   (OPENAI_API_KEY / GEMINI_API_KEY / NEWS_SUMMARY_PROVIDER=local + LOCAL_LLM_BASE_URL 등, summarizeAndPersistNews.ts 주석 참고)
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  runProcessNewsLoop,
  type RunProcessNewsOptions,
} from '@/bots/orchestrator/runProcessNewsLoop';

export const runtime = 'nodejs';

const MAX_LIMIT = 30;

function validateBody(raw: unknown): { options: RunProcessNewsOptions; error?: never } | { options?: never; error: string } {
  if (raw !== null && typeof raw !== 'object') {
    return { error: 'Request body must be a JSON object.' };
  }

  const body = (raw ?? {}) as Record<string, unknown>;
  const out: RunProcessNewsOptions = {};

  const idempotencyKey = body.idempotencyKey;
  if (idempotencyKey !== undefined) {
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
      return { error: 'idempotencyKey must be a non-empty string.' };
    }
    if (idempotencyKey.length > 128) {
      return { error: 'idempotencyKey must not exceed 128 characters.' };
    }
    out.idempotencyKey = idempotencyKey;
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
    out.limit = n;
  }

  return { options: out };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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
    const result = await runProcessNewsLoop(validation.options);

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
        {
          status:
            result.error ===
              'LLM not configured (OPENAI_API_KEY, GEMINI_API_KEY, or LOCAL_LLM_BASE_URL)' ||
            result.error === 'OPENAI_API_KEY not configured'
              ? 503
              : 500,
        },
      );
    }

    return NextResponse.json(
      { status: 'ok', run_id: result.run_id, output: result.output },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/process-news] Unhandled error:', message);
    return NextResponse.json({ status: 'error', error: 'Internal Server Error' }, { status: 500 });
  }
}
