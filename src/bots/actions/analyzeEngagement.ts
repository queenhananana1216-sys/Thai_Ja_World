/**
 * analyzeEngagement.ts — 커뮤니티 참여도 분석 봇 액션 (Phase 1: Mock)
 *
 * Phase 1: 모의(Mock) 메트릭을 반환합니다.
 * Phase 2 교체 포인트:
 *   - getServerSupabaseClient() 로 실제 집계 쿼리 실행
 *   - 외부 분석 API (e.g. 태자 월드 애널리틱스 서버) 호출
 *
 * 입력 `input` 에서 지원되는 선택 필드:
 *   - `targetDate` (string ISO 8601) — 특정 날짜 분석 (기본: 오늘)
 *   - `segment`    (string)          — 분석 대상 세그먼트 (기본: 전체)
 */

import type { ActionResult } from '../types/botTypes';

// ── 출력 타입 ─────────────────────────────────────────────────────────────

export interface EngagementMetrics {
  /** DAU (Daily Active Users) */
  dau: number;
  /** 평균 세션 시간 (분) */
  avg_session_minutes: number;
  /** 게시글 참여율 (0~1) */
  post_engagement_rate: number;
  /** 상위 주제 태그 */
  top_topics: string[];
  /** 분석 기준 날짜 */
  target_date: string;
  /** 분석 대상 세그먼트 */
  segment: string;
  /** 분석 완료 시각 (ISO 8601) */
  analyzed_at: string;
}

// ── 액션 본체 ─────────────────────────────────────────────────────────────

/**
 * analyzeEngagement
 *
 * @param input - runLoop 에서 전달되는 input_payload (선택 필드 포함)
 * @returns ActionResult<EngagementMetrics>
 */
export async function analyzeEngagement(
  input: Record<string, unknown> = {},
): Promise<ActionResult<EngagementMetrics>> {
  try {
    const targetDate =
      typeof input.targetDate === 'string'
        ? input.targetDate
        : new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const segment = typeof input.segment === 'string' ? input.segment : 'all';

    // ── Phase 2 교체 포인트 START ────────────────────────────────
    //
    // const client = getServerSupabaseClient();
    // const { data } = await client.rpc('get_daily_engagement', {
    //   p_date: targetDate, p_segment: segment
    // });
    //
    // ── Phase 2 교체 포인트 END ──────────────────────────────────

    const mockMetrics: EngagementMetrics = {
      dau: 1_240,
      avg_session_minutes: 8.4,
      post_engagement_rate: 0.067,
      top_topics: ['비자', 'THB 환율', '치앙마이 맛집', '코무이 광장'],
      target_date: targetDate,
      segment,
      analyzed_at: new Date().toISOString(),
    };

    return { success: true, output: mockMetrics };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return {
      success: false,
      output: {} as EngagementMetrics,
      error,
    };
  }
}
