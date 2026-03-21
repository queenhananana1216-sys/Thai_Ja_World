/**
 * app/api/bot/heal/route.ts — 셀프힐링 정책 트리거 API
 *
 * POST /api/bot/heal
 *
 * Request Body (JSON, 모두 선택):
 * {
 *   "type":     "bot_failed_streak",        // 미전달 시 Mock 신호 사용
 *   "severity": 2,                          // 1|2|3 (미전달 시 2)
 *   "details":  { "consecutive_failures": 5 }
 * }
 *
 * BOT_POLICY_MODE=auto  → action_type=heal, status=success, dry_run=true
 * BOT_POLICY_MODE=manual → action_type=heal, status=skipped, reason 포함
 *
 * Response 200:
 * {
 *   "status": "ok",
 *   "run_id": "...",
 *   "policy_mode": "auto"|"manual",
 *   "action_taken": "healed"|"skipped",
 *   "reason": "..." (manual 시)
 * }
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  handleIncident,
  createMockIncident,
} from '@/bots/actions/selfHeal';
import type { IncidentSignal, IncidentType } from '@/bots/types/botTypes';

export const runtime = 'nodejs';

const VALID_TYPES: IncidentType[] = [
  'high_error_rate',
  'service_unreachable',
  'bot_failed_streak',
];
const VALID_SEVERITIES = new Set([1, 2, 3]);

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

  // incident type 검증
  const rawType = body['type'];
  if (rawType !== undefined && !VALID_TYPES.includes(rawType as IncidentType)) {
    return NextResponse.json(
      {
        status: 'error',
        error: `type must be one of: ${VALID_TYPES.join(', ')}`,
      },
      { status: 400 },
    );
  }

  // severity 검증
  const rawSeverity = body['severity'];
  if (
    rawSeverity !== undefined &&
    !VALID_SEVERITIES.has(rawSeverity as number)
  ) {
    return NextResponse.json(
      { status: 'error', error: 'severity must be 1, 2, or 3.' },
      { status: 400 },
    );
  }

  // 신호 구성 (전달값 없으면 Mock 사용)
  const signal: IncidentSignal =
    rawType !== undefined
      ? {
          type: rawType as IncidentType,
          severity: (rawSeverity as 1 | 2 | 3) ?? 2,
          details:
            typeof body['details'] === 'object' && body['details'] !== null
              ? (body['details'] as Record<string, unknown>)
              : {},
        }
      : createMockIncident();

  try {
    const result = await handleIncident(signal);
    return NextResponse.json({ status: 'ok', ...result }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/heal] Unhandled error:', message);
    return NextResponse.json(
      { status: 'error', error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
