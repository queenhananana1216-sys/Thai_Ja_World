                /**
 * botTypes.ts — 태자 월드 봇 시스템 공유 타입 정의
 *
 * bot_actions 테이블 컬럼과 1:1 매핑.
 * 컬럼명을 절대 임의 변경하지 말 것 (마이그레이션 파일 기준).
 */

// ── 열거형 리터럴 ─────────────────────────────────────────────────────────

export type BotActionStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped';

export type BotActionType =
  | 'collect_data'
  | 'analyze'
  | 'publish'
  | 'alert'
  | 'heal';

// ── DB 행 전체 형태 ────────────────────────────────────────────────────────

export interface BotActionRow {
  id: string;
  run_id: string;
  bot_name: string;
  action_type: BotActionType;
  objective: string;
  target_entity?: string | null;
  target_id?: string | null;
  status: BotActionStatus;
  priority: number;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  metrics_before: Record<string, unknown>;
  metrics_after: Record<string, unknown>;
  error_code?: string | null;
  error_message?: string | null;
  retry_count: number;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
}

// ── 로거 파라미터 ──────────────────────────────────────────────────────────

export interface LogStartParams {
  run_id: string;
  bot_name: string;
  action_type: BotActionType;
  objective: string;
  target_entity?: string;
  target_id?: string;
  priority?: number;
  input_payload?: Record<string, unknown>;
  metrics_before?: Record<string, unknown>;
}

export interface LogSuccessUpdate {
  output_payload?: Record<string, unknown>;
  metrics_after?: Record<string, unknown>;
}

export interface LogFailUpdate {
  error_code?: string;
  error_message?: string;
  /** 현재 retry_count 값을 전달하면 +1 하여 저장됩니다. */
  current_retry_count?: number;
}

// ── 액션 공통 반환 형태 ────────────────────────────────────────────────────

export interface ActionResult<T = Record<string, unknown>> {
  success: boolean;
  output: T;
  error?: Error;
}

// ── 관리자 콘솔 필터 ──────────────────────────────────────────────────────

export interface AdminFilters {
  bot_name?: string;
  action_type?: BotActionType | '';
  status?: BotActionStatus | '';
  /** YYYY-MM-DD */
  date_from?: string;
  /** YYYY-MM-DD */
  date_to?: string;
}

// ── 토픽 스코어링 ─────────────────────────────────────────────────────────

export interface TopicScore {
  topic: string;
  /** 정규화 점수 0–100 */
  score: number;
  signals: {
    reactions: number;
    comments: number;
    avg_dwell_seconds: number;
  };
}

// ── 셀프힐링 인시던트 ─────────────────────────────────────────────────────

export type IncidentType =
  | 'high_error_rate'
  | 'service_unreachable'
  | 'bot_failed_streak';

export interface IncidentSignal {
  type: IncidentType;
  /** 1 = critical, 2 = warning, 3 = info */
  severity: 1 | 2 | 3;
  details: Record<string, unknown>;
}

export type BotPolicyMode = 'auto' | 'manual';

// ── bot_policies 테이블 형태 (Phase 3 준비) ───────────────────────────────

export interface BotPolicyRow {
  id: string;
  policy_mode: BotPolicyMode;
  /** 연속 실패 횟수 임계값 */
  heal_threshold: number;
  allowed_actions: BotActionType[];
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
