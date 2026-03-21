/**
 * app/api/bot/run/route.ts — 봇 실행 트리거 API 엔드포인트
 *
 * POST /api/bot/run
 *
 * Request Body (JSON, 모두 선택):
 * {
 *   "idempotencyKey": "daily-engage-2026-03-22",  // 중복 실행 방지
 *   "targetDate":     "2026-03-22",                // 분석 기준 날짜
 *   "segment":        "all"                        // 분석 세그먼트
 * }
 *
 * Response 200 — 성공:
 * { "status": "ok",      "run_id": "<uuid>", "output": { ... } }
 *
 * Response 200 — skip:
 * { "status": "skipped", "run_id": "<uuid>" }
 *
 * Response 400 — 잘못된 요청:
 * { "status": "error",   "error": "..." }
 *
 * Response 500 — 서버 오류:
 * { "status": "error",   "run_id": "<uuid>", "error": "..." }
 *
 * 보안 주의:
 *   - 이 라우트는 프로덕션에서 반드시 인증 미들웨어(API 키, JWT 등)로 보호해야 합니다.
 *   - 현재는 로컬 테스트 및 내부 cron 전용입니다.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runLoop, type RunLoopOptions } from '@/bots/orchestrator/runLoop';

export const runtime = 'nodejs';

// ── 입력 검증 헬퍼 ────────────────────────────────────────────────────────

const MAX_KEY_LENGTH = 128;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateBody(raw: unknown): { options: RunLoopOptions; error?: never } | { options?: never; error: string } {
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

  const targetDate = body.targetDate;
  if (targetDate !== undefined) {
    if (typeof targetDate !== 'string' || !DATE_REGEX.test(targetDate)) {
      return { error: 'targetDate must be a string in YYYY-MM-DD format.' };
    }
  }

  const segment = body.segment;
  if (segment !== undefined && typeof segment !== 'string') {
    return { error: 'segment must be a string.' };
  }

  return {
    options: {
      idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
      targetDate: typeof targetDate === 'string' ? targetDate : undefined,
      segment: typeof segment === 'string' ? segment : undefined,
    },
  };
}

// ── POST 핸들러 ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Body 파싱 (비어있어도 허용)
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

  // 입력 검증
  const validation = validateBody(rawBody);
  if (validation.error) {
    return NextResponse.json({ status: 'error', error: validation.error }, { status: 400 });
  }

  // 봇 실행
  try {
    const result = await runLoop(validation.options);

    if (result.skipped) {
      return NextResponse.json({ status: 'skipped', run_id: result.run_id }, { status: 200 });
    }

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', run_id: result.run_id, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { status: 'ok', run_id: result.run_id, output: result.output },
      { status: 200 },
    );
  } catch (err) {
    // 예상치 못한 최상위 오류 — 상세 내용은 서버 로그에만 기록
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/run] Unhandled error:', message);
    return NextResponse.json({ status: 'error', error: 'Internal Server Error' }, { status: 500 });
  }
}
