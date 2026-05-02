/**
 * Supabase/PostgREST DB 오류 중 사용자에게 노출하면 안 되는 시스템 메시지 판별·API 응답 매핑.
 * 클라이언트·서버 공통 (서버 전용 모듈에 의존하지 않음).
 */

/** 인프라·스키마 일시 오류 시 — 재시도 유도(동일 버튼 재클릭만으로 해결된다고 단정하지 않음) */
export const USER_DB_SYNC_TOAST_MESSAGE =
  '일시적인 서버 연결 문제일 수 있습니다. 새로고침(F5) 후 다시 등록해 보세요.';

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
