import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/** 포털 명예의 전당 푸터 — 당일 획득·보유·오늘 순위(RPC, 서울 달력) */
export type ViewerTodayThaiHall = {
  balance: number;
  todayEarned: number;
  todayRank: number | null;
};

export async function fetchViewerTodayThaiHallStats(
  sb: SupabaseClient,
  userId: string,
): Promise<ViewerTodayThaiHall | null> {
  const { data: sessionData } = await sb.auth.getUser();
  if (!sessionData?.user?.id || sessionData.user.id !== userId) return null;

  const { data, error } = await sb.rpc('get_viewer_today_dotori_stats');
  if (error || data == null || typeof data !== 'object') return null;

  const j = data as Record<string, unknown>;
  const balance = Number(j.balance ?? 0);
  const todayEarned = Number(j.todayEarned ?? 0);
  const tr = j.todayRank;
  const todayRank = tr === null || tr === undefined ? null : Number(tr);

  return {
    balance: Number.isFinite(balance) ? balance : 0,
    todayEarned: Number.isFinite(todayEarned) ? todayEarned : 0,
    todayRank:
      todayRank != null && Number.isFinite(todayRank) && todayRank > 0 ? Math.floor(todayRank) : null,
  };
}
