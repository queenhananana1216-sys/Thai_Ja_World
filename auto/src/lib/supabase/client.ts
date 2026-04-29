import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    console.error('[auto/browser] Supabase env missing. dummy client 반환');
    const chain: any = new Proxy(
      function dummy() {
        return chain;
      },
      {
        get(_target, prop: string | symbol) {
          if (prop === 'then') return (onFulfilled?: (value: unknown) => unknown) => Promise.resolve({ data: null, error: { message: '[auto/browser] Supabase disabled' } }).then(onFulfilled);
          return chain;
        },
        apply() {
          return chain;
        },
      },
    );
    return new Proxy({}, { get: () => () => chain }) as any;
  }
  return _createBrowserClient(
    url,
    key
  );
}
