import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/** 로그인 유저의 보유 도토리 순위(동점은 앞선 UUID 정렬과 무관하게 단순 gt 카운트) */
export async function fetchViewerDotoriBalanceRank(
  sb: SupabaseClient,
  userId: string,
): Promise<{ rank: number; balance: number } | null> {
  const { data: me, error: meErr } = await sb
    .from('profiles')
    .select('dotori_balance')
    .eq('id', userId)
    .maybeSingle();

  if (meErr || !me) return null;

  const balance = Number((me as { dotori_balance?: number }).dotori_balance ?? 0);

  const { count, error: cntErr } = await sb
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('dotori_balance', balance);

  if (cntErr) return { rank: 1, balance };

  const higher = typeof count === 'number' ? count : 0;
  return { rank: higher + 1, balance };
}
