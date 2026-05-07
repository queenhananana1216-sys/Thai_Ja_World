import 'server-only';

import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { recordPipelineErrorEvent } from '@/lib/pipeline/pipelineErrorLearning';
import type { KoreanBizRow } from '@/lib/korean-biz/koreanBizTypes';

const CORE_SELECT =
  'id, google_place_id, name, category, region, address, phone, latitude, longitude, is_verified, last_verified_at';

const EXTENDED_SELECT = `${CORE_SELECT}, line_url, whatsapp_url, contact_checked_at, contact_link_ok`;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isColumnOrSchemaDriftError(err: PostgrestError): boolean {
  const code = String(err.code ?? '');
  const msg = String(err.message ?? '').toLowerCase();
  if (code === '42703') return true;
  if (msg.includes('column') && msg.includes('does not exist')) return true;
  if (msg.includes('schema cache')) return true;
  if (msg.includes('could not find')) return true;
  return false;
}

/**
 * 공개 한인 생활망 목록 — 확장 컬럼이 아직 배포되지 않은 DB에서도 **코어 컬럼 폴백**으로 목록이 끊기지 않게 한다.
 */
export async function fetchKoreanBusinessesForPublicPage(
  sb: SupabaseClient,
): Promise<{ rows: KoreanBizRow[]; error: PostgrestError | null; usedCoreFallback: boolean }> {
  const first = await sb.from('korean_businesses').select(EXTENDED_SELECT).order('name');

  if (!first.error) {
    return { rows: (first.data ?? []) as KoreanBizRow[], error: null, usedCoreFallback: false };
  }

  if (isColumnOrSchemaDriftError(first.error)) {
    await recordPipelineErrorEvent({
      scope: 'public/korean-biz',
      reasonCode: 'korean_biz_select_extended_column_drift',
      messageExcerpt: first.error.message,
      meta: { code: first.error.code, fallback: 'core_select' },
    });
    const second = await sb.from('korean_businesses').select(CORE_SELECT).order('name');
    if (second.error) {
      await recordPipelineErrorEvent({
        scope: 'public/korean-biz',
        reasonCode: 'korean_biz_select_core_failed',
        messageExcerpt: second.error.message,
        meta: { code: second.error.code },
      });
      return { rows: [], error: second.error, usedCoreFallback: true };
    }
    return { rows: (second.data ?? []) as KoreanBizRow[], error: null, usedCoreFallback: true };
  }

  await recordPipelineErrorEvent({
    scope: 'public/korean-biz',
    reasonCode: 'korean_biz_select_failed',
    messageExcerpt: first.error.message,
    meta: { code: first.error.code },
  });
  return { rows: [], error: first.error, usedCoreFallback: false };
}

/**
 * 게이트웨이·일시 블록 대비 재시도(기본 3회, 지수형 짧은 백오프)
 */
export async function fetchKoreanBusinessesForPublicPageResilient(
  sb: SupabaseClient,
  opts?: { retries?: number },
): Promise<{ rows: KoreanBizRow[]; error: PostgrestError | null; usedCoreFallback: boolean }> {
  const maxAttempts = Math.max(1, Math.min(opts?.retries ?? 3, 6));
  let last = await fetchKoreanBusinessesForPublicPage(sb);
  if (!last.error) return last;

  for (let i = 1; i < maxAttempts; i++) {
    await sleep(160 * Math.pow(i, 1.08));
    last = await fetchKoreanBusinessesForPublicPage(sb);
    if (!last.error) return last;
  }
  return last;
}

/**
 * anon RLS 또는 네트워크 장애 시 공개 카탈로그 복구 — 서비스 롤 읽기(데이터 노출 범위는 동일 목록 컬럼)
 */
export async function fetchKoreanBusinessesViaServiceRole(): Promise<{
  rows: KoreanBizRow[];
  error: PostgrestError | null;
  usedCoreFallback: boolean;
}> {
  try {
    const { createServiceRoleClient, isServiceRoleConfigured } = await import('@/lib/supabase/admin');
    if (!isServiceRoleConfigured()) {
      return { rows: [], error: null, usedCoreFallback: false };
    }
    const svc = createServiceRoleClient();

    const first = await svc.from('korean_businesses').select(EXTENDED_SELECT).order('name');
    if (!first.error) {
      return {
        rows: (first.data ?? []) as KoreanBizRow[],
        error: null,
        usedCoreFallback: false,
      };
    }

    if (isColumnOrSchemaDriftError(first.error)) {
      await recordPipelineErrorEvent({
        scope: 'public/korean-biz',
        reasonCode: 'korean_biz_svc_select_extended_column_drift',
        messageExcerpt: first.error.message,
        meta: { code: first.error.code, fallback: 'core_select_svc' },
      });
      const second = await svc.from('korean_businesses').select(CORE_SELECT).order('name');
      if (second.error) {
        return { rows: [], error: second.error, usedCoreFallback: true };
      }
      return { rows: (second.data ?? []) as KoreanBizRow[], error: null, usedCoreFallback: true };
    }

    await recordPipelineErrorEvent({
      scope: 'public/korean-biz',
      reasonCode: 'korean_biz_svc_select_failed',
      messageExcerpt: first.error.message,
      meta: { code: first.error.code },
    });
    return { rows: [], error: first.error, usedCoreFallback: false };
  } catch {
    return { rows: [], error: null, usedCoreFallback: false };
  }
}
