/**
 * pipelineHealthQuery.ts — 봇 파이프라인 헬스 체크 유틸리티
 *
 * bot_actions 테이블을 조회해 각 파이프라인 컴포넌트의 최근 실행 상태를 분석합니다.
 *
 * 상태 정의:
 *   healthy  — 최근 24h 이내 success 기록 있음
 *   degraded — 최근 24–72h 이내 success 가 있거나, 최근 실행이 일부 실패 포함
 *   down     — 최근 72h 이내 success 없고 failed 기록 있음
 *   unknown  — 최근 72h 이내 기록 없음 (신규 배포 또는 미사용 컴포넌트)
 */

import { getServerSupabaseClient } from './supabaseClient';
import type { BotActionStatus } from '../types/botTypes';

// ── 파이프라인 컴포넌트 목록 ───────────────────────────────────────────────

export interface PipelineComponent {
  bot_name: string;
  /** 사람이 읽기 좋은 표시명 */
  label: string;
  /** 연결된 cron 경로 (있는 경우) */
  cron_path?: string;
}

/** 태자 월드에서 알려진 모든 봇 컴포넌트 */
export const PIPELINE_COMPONENTS: PipelineComponent[] = [
  {
    bot_name: 'news_curator',
    label: '뉴스 수집 (RSS → raw_news)',
    cron_path: '/api/cron/news',
  },
  {
    bot_name: 'news_summarizer',
    label: '뉴스 요약 (raw → processed_news)',
    cron_path: '/api/cron/news',
  },
  {
    bot_name: 'knowledge_curator_collect',
    label: '지식 수집 (knowledge_sources → raw_knowledge)',
    cron_path: '/api/cron/knowledge',
  },
  {
    bot_name: 'knowledge_curator_process',
    label: '지식 처리 (raw → processed_knowledge)',
    cron_path: '/api/cron/knowledge',
  },
  {
    bot_name: 'knowledge_stub_repair',
    label: '지식 스텁 재가공',
    cron_path: '/api/cron/knowledge-stubs',
  },
  {
    bot_name: 'engagement_optimizer',
    label: '참여도 분석',
  },
  {
    bot_name: 'self_healer',
    label: '셀프 힐링',
  },
];

// ── 헬스 상태 타입 ─────────────────────────────────────────────────────────

export type PipelineHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface BotHealthSummary {
  /** 최근 24h 내 성공 건수 */
  success_24h: number;
  /** 최근 24h 내 실패 건수 */
  failed_24h: number;
  /** 최근 24h 내 실행 중(stuck 가능) 건수 */
  running_24h: number;
  /** 최근 24–72h 내 성공 건수 */
  success_24_72h: number;
  /** 가장 최근 실행 상태 */
  last_status: BotActionStatus | null;
  /** 가장 최근 실행 시각 (ISO 8601) */
  last_run_at: string | null;
  /** 가장 최근 성공 시각 (ISO 8601) */
  last_success_at: string | null;
}

export interface PipelineComponentHealth {
  bot_name: string;
  label: string;
  cron_path?: string;
  status: PipelineHealthStatus;
  summary: BotHealthSummary;
}

export interface PipelineHealthReport {
  /** 보고서 생성 시각 */
  checked_at: string;
  /** 전체 파이프라인 상태 (가장 나쁜 컴포넌트 기준) */
  overall: PipelineHealthStatus;
  components: PipelineComponentHealth[];
}

// ── 헬스 계산 ─────────────────────────────────────────────────────────────

/**
 * 개별 컴포넌트 통계로부터 헬스 상태를 판단합니다.
 */
function computeStatus(s: BotHealthSummary): PipelineHealthStatus {
  // 최근 24h 성공 있음 → healthy
  if (s.success_24h > 0) return 'healthy';

  // 72h 이내 성공 있음 → degraded (오래됨)
  if (s.success_24_72h > 0) return 'degraded';

  // 기록 자체 없음
  if (s.last_run_at === null) return 'unknown';

  // 실패 기록만 있음
  if (s.failed_24h > 0) return 'down';

  // 오래 전 실행 기록만 있음 (72h+)
  return 'degraded';
}

function overallStatus(statuses: PipelineHealthStatus[]): PipelineHealthStatus {
  if (statuses.includes('down')) return 'down';
  if (statuses.includes('degraded')) return 'degraded';
  if (statuses.every((s) => s === 'healthy')) return 'healthy';
  return 'unknown';
}

// ── 메인 조회 ──────────────────────────────────────────────────────────────

/**
 * 파이프라인 전체 헬스 리포트를 반환합니다.
 * DB 오류 발생 시 모든 컴포넌트를 `unknown` 으로 표시합니다.
 */
export async function getPipelineHealthReport(): Promise<PipelineHealthReport> {
  const checkedAt = new Date().toISOString();
  const client = getServerSupabaseClient();

  const now = Date.now();
  const since72h = new Date(now - 72 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // 72h 이내 전체 bot_actions 를 한 번에 가져와 메모리에서 집계
  const { data, error } = await client
    .from('bot_actions')
    .select('bot_name, status, created_at, finished_at')
    .gte('created_at', since72h)
    .order('created_at', { ascending: false })
    .limit(2_000);

  const fallback = (botName: string, label: string, cron_path?: string): PipelineComponentHealth => ({
    bot_name: botName,
    label,
    cron_path,
    status: 'unknown',
    summary: {
      success_24h: 0,
      failed_24h: 0,
      running_24h: 0,
      success_24_72h: 0,
      last_status: null,
      last_run_at: null,
      last_success_at: null,
    },
  });

  if (error) {
    console.error('[PipelineHealth] bot_actions 조회 실패:', error.message);
    return {
      checked_at: checkedAt,
      overall: 'unknown',
      components: PIPELINE_COMPONENTS.map((c) => fallback(c.bot_name, c.label, c.cron_path)),
    };
  }

  const rows = (data ?? []) as Array<{
    bot_name: string;
    status: BotActionStatus;
    created_at: string;
    finished_at: string | null;
  }>;

  // 컴포넌트별 집계
  const components: PipelineComponentHealth[] = PIPELINE_COMPONENTS.map((comp) => {
    const compRows = rows.filter((r) => r.bot_name === comp.bot_name);

    let success_24h = 0;
    let failed_24h = 0;
    let running_24h = 0;
    let success_24_72h = 0;
    let last_run_at: string | null = null;
    let last_status: BotActionStatus | null = null;
    let last_success_at: string | null = null;

    for (const row of compRows) {
      const isIn24h = row.created_at >= since24h;

      if (isIn24h) {
        if (row.status === 'success') success_24h++;
        else if (row.status === 'failed') failed_24h++;
        else if (row.status === 'running') running_24h++;
      } else {
        if (row.status === 'success') success_24_72h++;
      }

      // 가장 최근 실행 (rows 는 created_at DESC 정렬)
      if (last_run_at === null) {
        last_run_at = row.created_at;
        last_status = row.status;
      }

      if (row.status === 'success' && last_success_at === null) {
        last_success_at = row.finished_at ?? row.created_at;
      }
    }

    const summary: BotHealthSummary = {
      success_24h,
      failed_24h,
      running_24h,
      success_24_72h,
      last_status,
      last_run_at,
      last_success_at,
    };

    return {
      bot_name: comp.bot_name,
      label: comp.label,
      cron_path: comp.cron_path,
      status: computeStatus(summary),
      summary,
    };
  });

  return {
    checked_at: checkedAt,
    overall: overallStatus(components.map((c) => c.status)),
    components,
  };
}
