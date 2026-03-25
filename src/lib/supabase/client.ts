/**
 * 브라우저용 Supabase 클라이언트 (인증 세션 유지)
 * `@supabase/ssr` 로 쿠키에 세션을 저장해 middleware 의 getUser() 와 동일한 출처를 씁니다.
 * (예전: supabase-js 단독 → localStorage 만 씀 → 헤더는 로그인인데 /local 은 로그인 요구하는 불일치)
 */
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

const BROWSER_FETCH_TIMEOUT_MS = 15_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), BROWSER_FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(tid));
}

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('[BrowserClient] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 필요');
  }

  return createSupabaseBrowserClient(url, key, {
    global: { fetch: fetchWithTimeout },
  });
}
