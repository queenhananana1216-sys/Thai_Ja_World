/**
 * scoreTopics.ts — 토픽별 참여도 스코어링 피드백 루프 (태자 월드)
 *
 * 순수 함수 scoreTopicsFromEngagement 와
 * bot_actions 로그를 남기는 래퍼 scoreTopicsFromEngagementAndLog 를 제공합니다.
 *
 * 스코어 계산 공식 (0–100 정규화):
 *   score = 0.40 × (reactions / max_reactions)
 *         + 0.35 × (comment_mentions / max_mentions)
 *         + 0.25 × min(dwell_sec, 300) / 300
 *
 * Phase 3 교체 포인트:
 *   - comment_mentions: 단순 단어 빈도 → NLP 토픽 모델
 *   - reactions: 별도 reactions 테이블에서 집계
 *   - dwellSample: 클라이언트 세션 이벤트에서 수집
 */

import { logFail, logStart, logSuccess } from '../logging/botActionLogger';
import type { ActionResult, TopicScore } from '../types/botTypes';

// ── 상수 ──────────────────────────────────────────────────────────────────

const REACTION_WEIGHT = 0.40;
const COMMENT_WEIGHT = 0.35;
const DWELL_WEIGHT = 0.25;
/** 드웰 타임 정규화 상한 (초) */
const MAX_DWELL_SECONDS = 300;

const BOT_NAME = 'engagement_optimizer' as const;

// ── 내부 헬퍼 ─────────────────────────────────────────────────────────────

/**
 * comments 배열에서 단어/해시태그 빈도 맵을 생성합니다.
 * 단순 단어 분리 방식이며 Phase 3에서 NLP 모델로 교체 예정입니다.
 */
function extractMentions(comments: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const comment of comments) {
    // 한글, 영문, 숫자, 해시태그 단어 추출
    const tokens = comment.match(/[#\w\uAC00-\uD7A3]+/gu) ?? [];
    for (const token of tokens) {
      const key = token.replace(/^#/, '').toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

// ── 순수 함수 (테스트 가능) ───────────────────────────────────────────────

/**
 * scoreTopicsFromEngagement
 *
 * @param reactions   topic → 리액션 수 (예: { '비자': 42, 'THB환율': 38 })
 * @param comments    원문 댓글 배열 (토픽 언급 추출에 사용)
 * @param dwellSample topic → 평균 드웰 타임(초)
 * @returns 점수 내림차순 TopicScore 배열
 */
export function scoreTopicsFromEngagement(
  reactions: Record<string, number>,
  comments: string[],
  dwellSample: Record<string, number>,
): TopicScore[] {
  const mentions = extractMentions(comments);

  // 모든 토픽 유니온
  const allTopics = new Set([
    ...Object.keys(reactions),
    ...Object.keys(dwellSample),
  ]);

  const maxReactions = Math.max(1, ...Object.values(reactions));
  const maxMentions = Math.max(1, ...Object.values(mentions));

  const scores: TopicScore[] = [];

  for (const topic of allTopics) {
    const r = reactions[topic] ?? 0;
    const c = mentions[topic.toLowerCase()] ?? 0;
    const d = Math.min(dwellSample[topic] ?? 0, MAX_DWELL_SECONDS);

    const score = Math.round(
      (REACTION_WEIGHT * (r / maxReactions) +
        COMMENT_WEIGHT * (c / maxMentions) +
        DWELL_WEIGHT * (d / MAX_DWELL_SECONDS)) *
        100,
    );

    scores.push({
      topic,
      score,
      signals: {
        reactions: r,
        comments: c,
        avg_dwell_seconds: Math.round(d),
      },
    });
  }

  return scores.sort((a, b) => b.score - a.score);
}

// ── 로그 포함 래퍼 ────────────────────────────────────────────────────────

/**
 * scoreTopicsFromEngagement 를 실행하고 결과를 bot_actions 에 기록합니다.
 *
 * @param run_id  오케스트레이터에서 생성된 UUID (공유 run_id)
 */
export async function scoreTopicsFromEngagementAndLog(
  run_id: string,
  reactions: Record<string, number>,
  comments: string[],
  dwellSample: Record<string, number>,
): Promise<ActionResult<TopicScore[]>> {
  const rowId = await logStart({
    run_id,
    bot_name: BOT_NAME,
    action_type: 'analyze',
    objective: '토픽별 참여도 스코어링 및 콘텐츠 피드백 루프',
    target_entity: 'topic',
    priority: 2,
    input_payload: {
      reaction_topic_count: Object.keys(reactions).length,
      comment_count: comments.length,
      dwell_topic_count: Object.keys(dwellSample).length,
    },
  });

  try {
    const scores = scoreTopicsFromEngagement(reactions, comments, dwellSample);
    const topTopic = scores[0]?.topic ?? null;

    if (rowId) {
      const outputPayload: Record<string, unknown> = {
        scores: scores as unknown[],
        top_topic: topTopic,
        topic_count: scores.length,
      };
      await logSuccess(rowId, {
        output_payload: outputPayload,
        metrics_after: {
          top_topic: topTopic,
          top_score: scores[0]?.score ?? 0,
          topic_count: scores.length,
        },
      });
    }

    return { success: true, output: scores };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (rowId) {
      await logFail(rowId, {
        error_code: 'SCORE_TOPICS_FAILED',
        error_message: error.message,
        current_retry_count: 0,
      });
    }
    return { success: false, output: [], error };
  }
}
