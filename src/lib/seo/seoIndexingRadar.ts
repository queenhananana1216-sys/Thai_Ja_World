import 'server-only';

import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { isGoogleIndexingConfigured } from '@/lib/seo/googleIndexingApi';

export type SeoIndexingRadar = {
  ok: boolean;
  seo_indexing_ok: boolean;
  skipped?: boolean;
  error?: string;
  last_batch_at?: string | null;
  last_batch_submitted?: number | null;
  last_batch_failed?: number | null;
};

const BATCH_KEY = 'seo.indexing_batch_last';
const STALE_FAIL_MAX_MS = 48 * 60 * 60 * 1000;

/**
 * 옴니 레이더 — `site_settings.seo.indexing_batch_last` 기준으로 마지막 배치 성공 여부를 본다.
 * 자격 미설정이면 skipped (LED 영향 없음).
 */
export async function checkSeoIndexingRadar(): Promise<SeoIndexingRadar> {
  const base: SeoIndexingRadar = {
    ok: true,
    seo_indexing_ok: true,
    skipped: true,
  };

  if (!isGoogleIndexingConfigured()) {
    return base;
  }
  if (!isServiceRoleConfigured()) {
    return {
      ok: false,
      seo_indexing_ok: false,
      skipped: false,
      error: 'service_role_unavailable',
    };
  }

  try {
    const sb = createServiceRoleClient();
    const { data: st, error } = await sb.from('site_settings').select('value, updated_at').eq('key', BATCH_KEY).maybeSingle();
    if (error) {
      return {
        ok: false,
        seo_indexing_ok: false,
        error: error.message,
      };
    }

    if (!st?.value || typeof st.value !== 'object') {
      /** 아직 배치가 한 번도 안 돌았으면 중립 통과 */
      return {
        ok: true,
        seo_indexing_ok: true,
        skipped: false,
        last_batch_at: null,
      };
    }

    const v = st.value as {
      at?: string;
      ok?: boolean;
      submitted?: number;
      failed?: number;
    };
    const at = typeof v.at === 'string' ? v.at : null;
    const batchOk = v.ok !== false;
    const failed = typeof v.failed === 'number' ? v.failed : 0;
    const submitted = typeof v.submitted === 'number' ? v.submitted : 0;

    if (!batchOk && at && Number.isFinite(Date.parse(at)) && Date.now() - Date.parse(at) < STALE_FAIL_MAX_MS) {
      return {
        ok: false,
        seo_indexing_ok: false,
        skipped: false,
        error: 'last_indexing_batch_had_failures',
        last_batch_at: at,
        last_batch_submitted: submitted,
        last_batch_failed: failed,
      };
    }

    return {
      ok: true,
      seo_indexing_ok: true,
      skipped: false,
      last_batch_at: at ?? st.updated_at ?? null,
      last_batch_submitted: submitted,
      last_batch_failed: failed,
    };
  } catch (e) {
    return {
      ok: false,
      seo_indexing_ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
