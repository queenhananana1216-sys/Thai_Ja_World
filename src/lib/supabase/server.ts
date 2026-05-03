/**
 * src/lib/supabase/server.ts — 서버 컴포넌트용 Supabase 클라이언트
 *
 * anon key 사용 → 공개 SELECT RLS 정책이 걸린 테이블만 읽기 가능.
 * 인증이 필요한 쓰기 작업에는 사용 금지.
 * SERVICE_ROLE 클라이언트(봇 전용): src/bots/adapters/supabaseClient.ts 참조.
 *
 * 연결 풀링: Vercel·Edge 등 동시 실행이 많으면 Dashboard 의 Transaction pooler 호스트를
 * `NEXT_PUBLIC_SUPABASE_URL` 로 쓰는 것을 권장(직접 연결 포화 완화).
 */
import { createClient } from '@supabase/supabase-js';
import { createDummySupabaseClient } from './dummy';

/** Supabase가 응답 없이 걸리면(방화벽·일시 DNS·프로젝트 중지 등) 홈 SSR이 무한 로딩되므로 상한 둠 */
const SERVER_FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), SERVER_FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(tid));
}

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    /** Dockerfile `next build` 단계에서만 스팸 방지 — 런타임은 그대로 경고 */
    if (process.env.NEXT_SUPPRESS_DUMMY_SUPABASE_WARN !== '1') {
      console.warn(
        '[ServerClient] NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 미설정 — dummy client 반환',
      );
    }
    return createDummySupabaseClient('server');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetchWithTimeout },
  });
}
