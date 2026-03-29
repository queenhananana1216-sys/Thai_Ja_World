/**
 * bot_actions 중 보관 기간을 지난 행 삭제 (관리자 봇 기록 정리)
 *
 * 장기 아카이브는 Supabase 백업·보내기로 별도 보관하세요.
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';

export type PurgeStaleBotActionsResult = {
  ok: boolean;
  matched?: number;
  error?: string;
};

export async function purgeStaleBotActions(): Promise<PurgeStaleBotActionsResult> {
  const raw = process.env.BOT_ACTIONS_RETENTION_DAYS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 7;
  const days = Number.isFinite(n) && n >= 1 ? Math.min(n, 365) : 7;

  const client = getServerSupabaseClient();
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  const { count, error: cErr } = await client
    .from('bot_actions')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', cutoff);

  if (cErr) {
    return { ok: false, error: `[count] ${cErr.message}` };
  }

  const { error: delErr } = await client.from('bot_actions').delete().lt('created_at', cutoff);

  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  return { ok: true, matched: count ?? undefined };
}
