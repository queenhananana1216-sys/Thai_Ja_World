/**
 * app/api/bot/feedback/route.ts — 토픽 스코어링 피드백 루프 트리거
 *
 * POST /api/bot/feedback
 *
 * Request Body (JSON, 모두 선택):
 * {
 *   "run_id":     "<uuid>",                          // 미전달 시 자동 생성
 *   "reactions":  { "비자": 42, "THB환율": 38 },     // 미전달 시 Mock 사용
 *   "comments":   ["댓글1", "댓글2"],                 // 미전달 시 Mock 사용
 *   "dwellSample":{ "비자": 182, "THB환율": 95 }     // 미전달 시 Mock 사용
 * }
 *
 * Response 200:
 * { "status": "ok", "run_id": "...", "scores": [...] }
 */

import { type NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { scoreTopicsFromEngagementAndLog } from '@/bots/actions/scoreTopics';

export const runtime = 'nodejs';

// ── Mock 데이터 (입력 없을 때 기본값) ─────────────────────────────────────

const MOCK_REACTIONS: Record<string, number> = {
  비자: 42,
  'THB 환율': 38,
  '치앙마이 맛집': 31,
  '코무이 광장': 17,
  '장기체류 팁': 25,
};

const MOCK_COMMENTS: string[] = [
  '비자 정보 완전 유용해요! #비자',
  'THB 환율 엄청 올랐네요 #THB환율',
  '치앙마이 맛집 추천 더 부탁해요',
  '비자 신청 절차 궁금해요',
  '장기체류 팁 알려주셔서 감사합니다',
  '#코무이광장 생각보다 크네요',
];

const MOCK_DWELL: Record<string, number> = {
  비자: 182,
  'THB 환율': 95,
  '치앙마이 맛집': 210,
  '코무이 광장': 54,
  '장기체류 팁': 140,
};

// ── 입력 타입 가드 헬퍼 ───────────────────────────────────────────────────

function isStringRecord(v: unknown): v is Record<string, number> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every((n) => typeof n === 'number')
  );
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === 'string');
}

// ── POST 핸들러 ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let rawBody: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) rawBody = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { status: 'error', error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  const body = (rawBody ?? {}) as Record<string, unknown>;

  // run_id 검증
  const run_id =
    typeof body['run_id'] === 'string' && body['run_id'].trim()
      ? (body['run_id'] as string)
      : randomUUID();

  // 입력값 검증 및 Mock 폴백
  const reactions = isStringRecord(body['reactions'])
    ? (body['reactions'] as Record<string, number>)
    : MOCK_REACTIONS;

  const comments = isStringArray(body['comments'])
    ? (body['comments'] as string[])
    : MOCK_COMMENTS;

  const dwellSample = isStringRecord(body['dwellSample'])
    ? (body['dwellSample'] as Record<string, number>)
    : MOCK_DWELL;

  try {
    const result = await scoreTopicsFromEngagementAndLog(
      run_id,
      reactions,
      comments,
      dwellSample,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          status: 'error',
          run_id,
          error: result.error?.message ?? 'Scoring failed.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { status: 'ok', run_id, scores: result.output },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/feedback] Unhandled error:', message);
    return NextResponse.json(
      { status: 'error', error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
