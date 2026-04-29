import { createServerClient as _createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    console.error('[auto/server] Supabase env missing. dummy client 반환');
    const chain: any = new Proxy(
      function dummy() {
        return chain;
      },
      {
        get(_target, prop: string | symbol) {
          if (prop === 'then') return (onFulfilled?: (value: unknown) => unknown) => Promise.resolve({ data: null, error: { message: '[auto/server] Supabase disabled' } }).then(onFulfilled);
          return chain;
        },
        apply() {
          return chain;
        },
      },
    );
    return new Proxy({}, { get: () => () => chain }) as any;
  }
  const cookieStore = await cookies();

  return _createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
