import 'server-only';

import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

type PipelineErrorMeta = Record<string, string | number | boolean | null>;

/**
 * 서비스 롤이 있을 때만 DB에 적재 — 다음 배포·대시보드에서 패턴 분석·자가 치우 우선순위에 사용.
 * 실패 시 조용히 무시(사용자 요청 경로를 막지 않음).
 */
export async function recordPipelineErrorEvent(input: {
  scope: string;
  reasonCode: string;
  messageExcerpt?: string | null;
  meta?: PipelineErrorMeta;
}): Promise<void> {
  if (!isServiceRoleConfigured()) return;
  const scope = String(input.scope ?? '').trim().slice(0, 120);
  const reasonCode = String(input.reasonCode ?? '').trim().slice(0, 120);
  if (!scope || !reasonCode) return;
  try {
    const sb = createServiceRoleClient();
    const excerpt = input.messageExcerpt != null ? String(input.messageExcerpt).slice(0, 500) : null;
    await sb.from('pipeline_error_events').insert({
      scope,
      reason_code: reasonCode,
      message_excerpt: excerpt,
      meta: (input.meta ?? {}) as Record<string, unknown>,
    });
  } catch {
    /* 로깅 실패는 요청 성공/실패와 분리 */
  }
}
