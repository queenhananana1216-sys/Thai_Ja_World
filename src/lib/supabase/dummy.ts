import type { SupabaseClient } from '@supabase/supabase-js';

type DummyError = { message: string };
type DynamicChain = Record<string | symbol, unknown> & ((...args: unknown[]) => unknown);

function buildDummyResult(scope: string) {
  return { data: null, error: { message: `[${scope}] Supabase is disabled (missing env)` } as DummyError };
}

function createThenableChain(scope: string): DynamicChain {
  const result = buildDummyResult(scope);
  const chainTarget = function dummyQueryBuilder() {
    return chainProxy;
  };
  const chainProxy = new Proxy(chainTarget, {
    get(_target, prop: string | symbol) {
      if (prop === 'then') return (onFulfilled?: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled);
      if (prop === 'catch') return (onRejected?: (reason: unknown) => unknown) => Promise.resolve(result).catch(onRejected);
      if (prop === 'finally') return (onFinally?: () => void) => Promise.resolve(result).finally(onFinally);
      return chainProxy;
    },
    apply() {
      return chainProxy;
    },
  });
  return chainProxy as DynamicChain;
}

function createDummyAuth(scope: string) {
  const baseResult = buildDummyResult(scope);
  return {
    async getSession() {
      return { data: { session: null }, error: null };
    },
    async getUser() {
      return { data: { user: null }, error: null };
    },
    async signInWithPassword() {
      return baseResult;
    },
    async signOut() {
      return { error: null };
    },
  };
}

/** Env 누락 시 앱 전체 500 방지를 위한 no-op Supabase 클라이언트 */
export function createDummySupabaseClient(scope: string): SupabaseClient {
  const queryChain = createThenableChain(scope);
  const proxy = new Proxy(
    {},
    {
      get(_target, prop: string | symbol) {
        if (prop === 'auth') return createDummyAuth(scope);
        if (prop === 'rpc') return () => queryChain;
        if (prop === 'from') return () => queryChain;
        if (prop === 'storage') return queryChain;
        if (prop === 'channel') return () => queryChain;
        return queryChain;
      },
    },
  );
  return proxy as SupabaseClient;
}
