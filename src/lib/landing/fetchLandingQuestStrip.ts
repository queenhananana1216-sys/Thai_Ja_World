import 'server-only';

import { tryCreateServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import type { Locale } from '@/i18n/types';

/**
 * 랜딩 "오늘의 퀘스트" 스트립 — RLS(099)상 quest_definitions 는 authenticated SELECT 만 허용.
 * anon → 빈 데이터 + UI 에서 로그인 유도 (가짜 목록 생성 금지)
 *
 * @see supabase/migrations/099_quest_system_rpcs_and_tables.sql — quest_definitions
 * @see app/api/quests — 본인 인스턴스 (JWT)
 */

export type QuestStripItem = {
  questCode: string;
  title: string;
  goal: number;
  rewardCorn: number;
};

export type LandingQuestStrip = { kind: 'signed_out' } | { kind: 'ok'; items: QuestStripItem[]; degraded: boolean };

const STRIP_LIMIT = 5;

export async function fetchLandingQuestStrip(locale: Locale): Promise<LandingQuestStrip> {
  try {
    const sb = await tryCreateServerSupabaseAuthClient();
    if (!sb) return { kind: 'ok', items: [], degraded: true };

    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData.session) return { kind: 'signed_out' };

    const { data, error } = await sb
      .from('quest_definitions')
      .select('quest_code, title_ko, title_th, default_goal, default_reward_corn, is_base_daily, is_active')
      .eq('is_active', true)
      .eq('is_base_daily', true)
      .order('quest_code', { ascending: true })
      .limit(STRIP_LIMIT);

    if (error) {
      return { kind: 'ok', items: [], degraded: true };
    }

    const titleKey: 'title_ko' | 'title_th' = locale === 'th' ? 'title_th' : 'title_ko';
    const items: QuestStripItem[] = (data ?? []).map((row) => {
      const r = row as {
        quest_code: string;
        title_ko: string;
        title_th: string;
        default_goal: number | null;
        default_reward_corn: number | null;
      };
      const t = (titleKey === 'title_th' ? r.title_th : r.title_ko) || r.title_ko;
      return {
        questCode: r.quest_code,
        title: t.trim() || r.title_ko?.trim() || 'Quest',
        goal: typeof r.default_goal === 'number' ? r.default_goal : 0,
        rewardCorn: typeof r.default_reward_corn === 'number' ? r.default_reward_corn : 0,
      };
    });

    return { kind: 'ok', items, degraded: false };
  } catch {
    return { kind: 'ok', items: [], degraded: true };
  }
}
