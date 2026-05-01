/**
 * Supabase/PostgREST DB 오류 중 사용자에게 노출하면 안 되는 시스템 메시지 판별·API 응답 매핑.
 * 클라이언트·서버 공통 (서버 전용 모듈에 의존하지 않음).
 */

export const USER_DB_SYNC_TOAST_MESSAGE =
  '🛠️ 서버 데이터를 동기화 중입니다. 3초 뒤에 [올리기] 버튼을 다시 눌러주세요.';

export function shouldMaskRawDbError(message: string): boolean {
  const m = message.toLowerCase();
  if (m.includes('schema cache')) return true;
  if (m.includes('could not find') && m.includes('column')) return true;
  if (m.includes('postgrest') || m.includes('pgrst')) return true;
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
