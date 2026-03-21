/**
 * botActionsQuery.ts — 관리 콘솔용 서버 전용 bot_actions 조회 유틸리티
 *
 * 이 모듈은 SUPABASE_SERVICE_ROLE_KEY 를 사용하여 서버에서만 실행됩니다.
 * 브라우저 번들에 절대 포함되지 않도록 'server-only' 가드를 선언합니다.
 */

import 'server-only';
import { getServerSupabaseClient } from './supabaseClient';
import type { AdminFilters, BotActionRow } from '../types/botTypes';

const TABLE = 'bot_actions' as const;
/** 단일 조회의 최대 행 수 — 페이지네이션 없이 안전한 상한 */
const ROW_LIMIT = 200;

// ── 필터링 조회 ───────────────────────────────────────────────────────────

/**
 * AdminFilters 를 적용하여 bot_actions 목록을 최신순으로 조회합니다.
 * DB 오류 발생 시 빈 배열을 반환합니다.
 */
export async function queryBotActions(filters: AdminFilters): Promise<BotActionRow[]> {
  const client = getServerSupabaseClient();

  // PostgREST 쿼리 빌더: 각 필터는 값이 있을 때만 적용
  let q = client
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(ROW_LIMIT);

  if (filters.bot_name) q = q.eq('bot_name', filters.bot_name);
  if (filters.action_type) q = q.eq('action_type', filters.action_type);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.date_from) q = q.gte('created_at', `${filters.date_from}T00:00:00.000Z`);
  if (filters.date_to) q = q.lte('created_at', `${filters.date_to}T23:59:59.999Z`);

  const { data, error } = await q;

  if (error) {
    console.error('[BotActionsQuery] queryBotActions 실패:', error.message);
    return [];
  }

  return (data ?? []) as BotActionRow[];
}

// ── 고유 봇 이름 목록 ─────────────────────────────────────────────────────

/**
 * bot_actions 테이블에 존재하는 고유 bot_name 목록을 반환합니다.
 * 필터 드롭다운 옵션 생성에 사용됩니다.
 * (실제 서비스 규모에서는 RPC 또는 materialized view 로 교체 권장)
 */
export async function getDistinctBotNames(): Promise<string[]> {
  const client = getServerSupabaseClient();

  const { data, error } = await client
    .from(TABLE)
    .select('bot_name')
    .order('bot_name')
    .limit(1_000);

  if (error) {
    console.error('[BotActionsQuery] getDistinctBotNames 실패:', error.message);
    return [];
  }

  const names = new Set<string>(
    (data ?? []).map((row: unknown) => {
      const r = row as { bot_name: string };
      return r.bot_name;
    }),
  );
  return Array.from(names);
}
