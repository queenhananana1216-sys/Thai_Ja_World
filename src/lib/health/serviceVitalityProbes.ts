import 'server-only';

import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export type ServiceVitalityResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
} & Record<string, unknown>;

/** 활성 포춘 tips + 도토리 보상 설정 존재 */
export async function checkFortuneVitality(): Promise<
  ServiceVitalityResult & { tips_active?: number; reward_amount?: number }
> {
  if (!isServiceRoleConfigured()) {
    return { ok: true, skipped: true, error: 'service_role_missing' };
  }
  try {
    const sb = createServiceRoleClient();
    const { count, error } = await sb
      .from('tips')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    if (error) return { ok: false, error: error.message };
    const n = count ?? 0;

    const { data: row, error: e2 } = await sb
      .from('site_settings')
      .select('value')
      .eq('key', 'economy.daily_fortune_dotori')
      .maybeSingle();
    if (e2) return { ok: false, tips_active: n, error: e2.message };

    const raw = row?.value as Record<string, unknown> | undefined;
    const amtRaw = raw?.amount;
    const amount = typeof amtRaw === 'number' ? amtRaw : Number(amtRaw ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, tips_active: n, error: 'fortune_reward_not_configured' };
    }
    if (n < 1) {
      return { ok: false, tips_active: 0, reward_amount: amount, error: 'no_active_tips' };
    }
    return { ok: true, tips_active: n, reward_amount: amount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 한인 생활망(업체 카탈로그) 비었는지 — 비면 포털 바로가기가 공허 */
export async function checkKoreanLivingGridNonempty(): Promise<ServiceVitalityResult & { rows?: number }> {
  if (!isServiceRoleConfigured()) {
    return { ok: true, skipped: true, error: 'service_role_missing' };
  }
  try {
    const sb = createServiceRoleClient();
    const { count, error } = await sb.from('korean_businesses').select('id', { count: 'exact', head: true });
    if (error) return { ok: false, error: error.message };
    const n = count ?? 0;
    if (n < 1) return { ok: false, rows: 0, error: 'korean_businesses_empty' };
    return { ok: true, rows: n };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 최근 파이프라인 오류 로그(LLM 쿼터·뉴스/지식 등) 스캔.
 * 과도한 실패 또는 429/쿼터 패턴이 있으면 관제 주황( degraded ) 근거로 사용.
 */
export async function checkContentPipelineStress(): Promise<
  ServiceVitalityResult & { stressful_rows?: number; window_minutes?: number }
> {
  if (!isServiceRoleConfigured()) {
    return { ok: true, skipped: true, error: 'service_role_missing' };
  }
  const WINDOW_MIN = 45;
  try {
    const sb = createServiceRoleClient();
    const since = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString();
    const { data, error } = await sb
      .from('pipeline_error_events')
      .select('scope, reason_code, message_excerpt')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(120);
    if (error) return { ok: true, skipped: true, error: 'pipeline_events_unreadable' };

    const rows = data ?? [];
    const contentish = rows.filter((r) => {
      const s = `${r.scope ?? ''} ${r.reason_code ?? ''} ${r.message_excerpt ?? ''}`.toLowerCase();
      return /fortune|gemini|openai|llm|spark|processed_news|knowledge|news|curator|ingest|429|quota|rate|generate_content|http\s*429/.test(
        s,
      );
    });

    const critical = contentish.filter((r) => {
      const s = `${r.message_excerpt ?? ''} ${r.reason_code ?? ''} ${r.scope ?? ''}`.toLowerCase();
      return /429|quota|rate\s*limit|exceeded|llm\s*http/i.test(s);
    });

    if (critical.length >= 1) {
      return {
        ok: false,
        stressful_rows: critical.length,
        window_minutes: WINDOW_MIN,
        error: 'llm_quota_or_hard_fail_recent',
      };
    }
    if (contentish.length >= 10) {
      return {
        ok: false,
        stressful_rows: contentish.length,
        window_minutes: WINDOW_MIN,
        error: 'content_pipeline_noise_high',
      };
    }
    return { ok: true, window_minutes: WINDOW_MIN };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function extendedVitalityAllOk(
  fortune: ServiceVitalityResult,
  korean: ServiceVitalityResult,
  content: ServiceVitalityResult,
): boolean {
  const f = fortune.skipped === true || fortune.ok;
  const k = korean.skipped === true || korean.ok;
  const c = content.skipped === true || content.ok;
  return f && k && c;
}
