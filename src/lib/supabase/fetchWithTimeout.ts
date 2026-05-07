/**
 * SSR·클라이언트 간 공통: PostgREST/Supabase 무응답 시 세그먼트가 무한 대기하지 않도록 fetch 상한
 */
export const DEFAULT_SUPABASE_FETCH_TIMEOUT_MS = 10_000;
export const SITE_SETTINGS_FETCH_TIMEOUT_MS = 6500;
export const KOREAN_BIZ_FETCH_BUDGET_MS = 8500;

export function fetchWithTimeout(
  ms: number,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), ms);
    const merged = init?.signal
      ? (() => {
          const upstream = init.signal;
          if (upstream.aborted) ctrl.abort();
          upstream.addEventListener('abort', () => ctrl.abort(), { once: true });
          return { ...init, signal: ctrl.signal };
        })()
      : { ...init, signal: ctrl.signal };
    return fetch(input, merged).finally(() => clearTimeout(tid));
  };
}
