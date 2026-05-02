/**
 * Supabase/PostgREST DB 오류 중 사용자에게 노출하면 안 되는 시스템 메시지 판별·API 응답 매핑.
 * 클라이언트·서버 공통 (서버 전용 모듈에 의존하지 않음).
 */

/** @deprecated 오너 디버깅용 — 블랙박스 문구 금지; 폼에서 서버 message/details/hint 원문을 우선 표시 */
export const USER_DB_SYNC_TOAST_MESSAGE = '';

/** 라우터 소프트 리프레시만 — 전체 리로드 없이 서버 컴포넌트·fetch 캐시 갱신 유도 */
export function scheduleSoftNavigationRefresh(runRefresh: () => void): void {
  if (typeof window === 'undefined') return;
  queueMicrotask(() => {
    try {
      runRefresh();
    } catch {
      /* ignore */
    }
  });
}

export function shouldMaskRawDbError(message: string): boolean {
  const m = message.toLowerCase();
  if (m.includes('schema cache')) return true;
  if (m.includes('could not find') && m.includes('column')) return true;
  /** PostgREST 스키마·컬럼 캐시 전용 코드 (문자열 전체에 pgrst/postgrest 가 들어가면 과마스킹됨) */
  if (m.includes('pgrst204') || m.includes('pgrst205')) return true;
  if (
    (m.includes('latitude') || m.includes('longitude')) &&
    (m.includes('column') || m.includes('schema') || m.includes('does not exist'))
  ) {
    return true;
  }
  if (m.includes('42703')) return true;
  return false;
}

export function fireDbErrorRadar(context: string): void {
  if (typeof window === 'undefined') return;
  try {
    void fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'db_error_radar', context }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

/** API 라우트에서 Supabase 에러 메시지를 공개 응답으로 매핑 */
export function publicBodyFromSupabaseMessage(
  message: string,
): { status: number; body: { error: string; code?: string } } {
  if (shouldMaskRawDbError(message)) {
    return {
      status: 503,
      body: { error: 'schema_sync', code: 'SCHEMA_SYNC' },
    };
  }
  return { status: 500, body: { error: message } };
}

/** Supabase/PostgREST 에러 객체 (라우트 catch 공통) */
export type SupabaseHttpErrorFields = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

/** Bearer 보호된 쓰기 API — 백엔드 로그에 전체 필드, 응답에 supabase_* 로 디버깅 가능하게 */
export function logSupabaseWriteFailure(context: string, err: SupabaseHttpErrorFields): void {
  console.error(
    `[${context}]`,
    err.message,
    err.code ? `code=${err.code}` : '',
    err.details ? `details=${err.details}` : '',
    err.hint ? `hint=${err.hint}` : '',
  );
}

export function jsonBodyForAuthenticatedWriteError(err: SupabaseHttpErrorFields): {
  status: number;
  body: Record<string, unknown>;
} {
  const msg = err.message ?? '';
  const masked = shouldMaskRawDbError(msg);
  const status = masked ? 503 : 500;
  return {
    status,
    body: {
      error: masked ? 'schema_sync' : msg,
      code: masked ? 'SCHEMA_SYNC' : (err.code ?? 'UNKNOWN'),
      supabase_message: msg,
      supabase_code: err.code ?? null,
      supabase_details: err.details ?? null,
      supabase_hint: err.hint ?? null,
    },
  };
}

/** 통합 게시판(board_posts) 쓰기 — 메시지 마스킹 금지(프로덕션 원인 추적·오너 디버깅) */
export function jsonBodyForBoardWriteVerbose(err: SupabaseHttpErrorFields): {
  status: number;
  body: Record<string, unknown>;
} {
  const msg = err.message ?? 'unknown_error';
  const transient = /pgrst|schema|cache|timeout|57014|53300/i.test(msg) || shouldMaskRawDbError(msg);
  return {
    status: transient ? 503 : 500,
    body: {
      error: msg,
      code: err.code ?? 'BOARD_WRITE_ERROR',
      supabase_message: msg,
      supabase_code: err.code ?? null,
      supabase_details: err.details ?? null,
      supabase_hint: err.hint ?? null,
    },
  };
}

/** 클라이언트 토스트·인라인 오류 — PostgREST message·details·hint를 한 블록으로 (블랙박스 해제) */
export function formatSupabaseClientErrorPayload(payload: {
  message?: string | null;
  code?: string | null;
  error?: string | null;
  supabase_message?: string | null;
  supabase_code?: string | null;
  supabase_details?: string | null;
  supabase_hint?: string | null;
}): string {
  const primary =
    payload.message?.trim() ||
    payload.supabase_message?.trim() ||
    payload.error?.trim() ||
    '';
  const lines: string[] = [];
  if (primary) lines.push(primary);
  const det = payload.supabase_details?.trim();
  if (det) lines.push(det);
  const hint = payload.supabase_hint?.trim();
  if (hint) lines.push(`hint: ${hint}`);
  const code = payload.supabase_code?.trim() || payload.code?.trim();
  if (code && code !== 'UNKNOWN' && code !== 'BOARD_WRITE_ERROR') {
    lines.push(`code: ${code}`);
  }
  return lines.length > 0 ? lines.join('\n') : '알 수 없는 오류';
}
