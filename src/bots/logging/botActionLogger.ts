/**
 * botActionLogger.ts — bot_actions 테이블 라이프사이클 로깅 유틸리티
 *
 * 제공 함수:
 *   isDuplicate  — 동일 bot_name + idempotencyKey 가 24시간 내 성공했는지 확인
 *   logStart     — 'running' 상태 행 삽입 → 생성된 row id 반환
 *   logSuccess   — 해당 row 를 'success' 로 업데이트
 *   logFail      — 해당 row 를 'failed' 로 업데이트, retry_count +1
 *   logSkip      — 해당 row 를 'skipped' 로 업데이트 (정책 차단 등)
 *
 * bot_actions 컬럼명은 migrations/001_create_bot_actions.sql 기준 — 변경 금지.
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';
import type { LogStartParams, LogSuccessUpdate, LogFailUpdate } from '../types/botTypes';

const TABLE = 'bot_actions' as const;

// ── 유틸 ──────────────────────────────────────────────────────────────────

/** ISO 8601 현재 시각 문자열 */
const now = (): string => new Date().toISOString();

// ── 아이뎀포턴시 체크 ─────────────────────────────────────────────────────

/**
 * 동일한 `bot_name` + `idempotencyKey` 조합이 최근 24시간 이내에
 * `success` 상태로 완료된 적 있으면 `true` 반환.
 *
 * DB 접근 실패 시 `false` 반환(fail-open) — 중복 차단보다 실행 보장 우선.
 */
export async function isDuplicate(
  botName: string,
  idempotencyKey: string,
): Promise<boolean> {
  // 입력 기본 검증
  if (!botName.trim() || !idempotencyKey.trim()) return false;

  const client = getServerSupabaseClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from(TABLE)
    .select('id')
    .eq('bot_name', botName)
    .eq('status', 'success')
    // input_payload @> '{"idempotencyKey":"<value>"}'
    .contains('input_payload', { idempotencyKey })
    .gte('created_at', since)
    .limit(1);

  if (error) {
    console.error('[BotLogger] isDuplicate 쿼리 실패 (fail-open):', error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

// ── 시작 로그 ─────────────────────────────────────────────────────────────

/**
 * 액션 시작 시 `running` 상태 행을 삽입합니다.
 * 성공 시 생성된 row `id`(UUID)를 반환, 실패 시 `null` 반환.
 */
export async function logStart(params: LogStartParams): Promise<string | null> {
  const client = getServerSupabaseClient();

  const { data, error } = await client
    .from(TABLE)
    .insert({
      run_id: params.run_id,
      bot_name: params.bot_name,
      action_type: params.action_type,
      objective: params.objective,
      target_entity: params.target_entity ?? null,
      target_id: params.target_id ?? null,
      status: 'running',
      priority: params.priority ?? 3,
      input_payload: params.input_payload ?? {},
      output_payload: {},
      metrics_before: params.metrics_before ?? {},
      metrics_after: {},
      retry_count: 0,
      started_at: now(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[BotLogger] logStart 실패:', error.message);
    return null;
  }

  return (data as { id: string } | null)?.id ?? null;
}

// ── 성공 로그 ─────────────────────────────────────────────────────────────

/**
 * 지정 row 를 `success` 로 업데이트합니다.
 * @param rowId  logStart() 가 반환한 row id
 */
export async function logSuccess(
  rowId: string,
  params: LogSuccessUpdate = {},
): Promise<void> {
  const client = getServerSupabaseClient();

  const { error } = await client
    .from(TABLE)
    .update({
      status: 'success',
      output_payload: params.output_payload ?? {},
      metrics_after: params.metrics_after ?? {},
      finished_at: now(),
    })
    .eq('id', rowId);

  if (error) {
    console.error('[BotLogger] logSuccess 실패 (row_id=%s):', rowId, error.message);
  }
}

// ── 실패 로그 ─────────────────────────────────────────────────────────────

/**
 * 지정 row 를 `failed` 로 업데이트하고 `retry_count` 를 1 증가시킵니다.
 * @param rowId  logStart() 가 반환한 row id
 */
export async function logFail(rowId: string, params: LogFailUpdate = {}): Promise<void> {
  const client = getServerSupabaseClient();

  const { error } = await client
    .from(TABLE)
    .update({
      status: 'failed',
      error_code: params.error_code ?? 'UNKNOWN_ERROR',
      error_message: params.error_message ?? 'An unexpected error occurred.',
      retry_count: (params.current_retry_count ?? 0) + 1,
      finished_at: now(),
    })
    .eq('id', rowId);

  if (error) {
    console.error('[BotLogger] logFail 실패 (row_id=%s):', rowId, error.message);
  }
}

// ── 스킵 로그 ─────────────────────────────────────────────────────────────

/**
 * 지정 row 를 `skipped` 로 업데이트합니다.
 * 정책 차단(manual 모드), 조건 미충족 등 의도적 건너뜀에 사용합니다.
 * @param rowId   logStart() 가 반환한 row id
 * @param reason  건너뜀 사유 (error_message 에 저장)
 */
export async function logSkip(rowId: string, reason: string): Promise<void> {
  const client = getServerSupabaseClient();

  const { error } = await client
    .from(TABLE)
    .update({
      status: 'skipped',
      error_code: 'SKIPPED',
      error_message: reason,
      finished_at: now(),
    })
    .eq('id', rowId);

  if (error) {
    console.error('[BotLogger] logSkip 실패 (row_id=%s):', rowId, error.message);
  }
}
