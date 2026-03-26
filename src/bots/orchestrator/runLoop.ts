/**
 * runLoop.ts — 태자 월드 봇 실행 오케스트레이터
 *
 * 실행 흐름:
 *   1. run_id 생성 (crypto.randomUUID — Node 내장, 외부 의존 없음)
 *   2. idempotencyKey 가 있으면 24h 중복 실행 여부 확인 → 중복 시 skip
 *   3. bot_actions 에 'running' 행 삽입 (logStart)
 *   4. analyzeEngagement 액션 실행
 *   5. 성공 → logSuccess / 실패 → logFail (retry_count +1)
 *   6. RunLoopResult 반환
 */

import { randomUUID } from 'node:crypto';
import { isDuplicate, logFail, logStart, logSuccess } from '../logging/botActionLogger';
import { analyzeEngagement, type EngagementMetrics } from '../actions/analyzeEngagement';

// ── 입출력 타입 ───────────────────────────────────────────────────────────

export interface RunLoopOptions {
  /**
   * 선택적 아이덴포턴시 키.
   * 제공 시 동일 키로 24시간 내 성공한 실행이 있으면 skip 됩니다.
   */
  idempotencyKey?: string;
  /** 분석 대상 날짜 (YYYY-MM-DD). 미입력 시 오늘 날짜. */
  targetDate?: string;
  /** 분석 세그먼트 (기본: 'all') */
  segment?: string;
}

export interface RunLoopResult {
  /** 이번 실행에 부여된 UUID */
  run_id: string;
  /** 중복 실행으로 skip 되었으면 true */
  skipped: boolean;
  /** 액션 성공 여부 (skip 된 경우 undefined) */
  success?: boolean;
  /** 액션 출력 결과 */
  output?: Record<string, unknown>;
  /** 실패 시 에러 메시지 */
  error?: string;
}

// ── 봇 상수 ───────────────────────────────────────────────────────────────

const BOT_NAME = 'engagement_optimizer' as const;
const ACTION_TYPE = 'analyze' as const;
const OBJECTIVE = 'DAU 증가 및 커뮤니티 참여도 분석' as const;
const PRIORITY = 2 as const; // 1(high) ~ 5(low)

// ── 메인 실행 루프 ────────────────────────────────────────────────────────

/**
 * runLoop
 *
 * 단일 봇 실행 사이클을 수행하고 결과를 반환합니다.
 * API 라우트, cron 핸들러, 스크립트 등에서 직접 호출 가능합니다.
 */
export async function runLoop(options: RunLoopOptions = {}): Promise<RunLoopResult> {
  const { idempotencyKey, targetDate, segment } = options;
  const run_id = randomUUID();

  // input_payload 구성 (DB 저장 및 아이덴포턴시 체크에 사용)
  const inputPayload: Record<string, unknown> = {};
  if (idempotencyKey) inputPayload.idempotencyKey = idempotencyKey;
  if (targetDate) inputPayload.targetDate = targetDate;
  if (segment) inputPayload.segment = segment;

  console.log(`[RunLoop] 시작 run_id=${run_id} bot=${BOT_NAME}`);

  // ── Step 1: 중복 실행 체크 ────────────────────────────────────────────
  if (idempotencyKey) {
    const duplicate = await isDuplicate(BOT_NAME, idempotencyKey);
    if (duplicate) {
      console.log(`[RunLoop] SKIP — 중복 idempotencyKey: ${idempotencyKey}`);
      return { run_id, skipped: true };
    }
  }

  // ── Step 2: 'running' 행 삽입 ─────────────────────────────────────────
  const rowId = await logStart({
    run_id,
    bot_name: BOT_NAME,
    action_type: ACTION_TYPE,
    objective: OBJECTIVE,
    target_entity: 'community',
    priority: PRIORITY,
    input_payload: inputPayload,
  });

  if (!rowId) {
    // DB 삽입 실패 — 상세 에러는 logStart 내부에서 이미 출력됨
    return {
      run_id,
      skipped: false,
      success: false,
      error: 'DB insert failed at logStart — 환경 변수 또는 네트워크를 확인하세요.',
    };
  }

  // ── Step 3: 액션 실행 ────────────────────────────────────────────────
  const result = await analyzeEngagement(inputPayload);

  // ── Step 4: 결과 로깅 ────────────────────────────────────────────────
  if (result.success) {
    const metrics = result.output as EngagementMetrics;
    // EngagementMetrics 는 모든 값이 JSON-직렬화 가능하므로 안전하게 캐스팅
    const outputPayload = metrics as unknown as Record<string, unknown>;

    await logSuccess(rowId, {
      output_payload: outputPayload,
      metrics_after: {
        dau: metrics.dau,
        post_engagement_rate: metrics.post_engagement_rate,
      },
    });

    console.log(`[RunLoop] ✓ SUCCESS run_id=${run_id}`);
    return { run_id, skipped: false, success: true, output: outputPayload };
  } else {
    await logFail(rowId, {
      error_code: 'ANALYZE_ENGAGEMENT_FAILED',
      error_message: result.error?.message ?? 'Unknown failure during analyzeEngagement',
      current_retry_count: 0,
    });

    console.error(`[RunLoop] ✗ FAILED run_id=${run_id}:`, result.error?.message);
    return {
      run_id,
      skipped: false,
      success: false,
      error: result.error?.message ?? 'Unknown failure',
    };
  }
}
