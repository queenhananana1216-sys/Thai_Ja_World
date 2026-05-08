try {
  // Allow Node CLI/tsx maintenance scripts to reuse this module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional in non-Next runtimes
  require('server-only');
} catch {
  // no-op outside Next.js server component boundary checks
}
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** 크론·봇·관리 쓰기 — 반드시 이 env 이름만 사용 (anon / NEXT_PUBLIC_ANON 금지). */
export const SUPABASE_SERVICE_ROLE_ENV = 'SUPABASE_SERVICE_ROLE_KEY' as const;

/** 프로덕션 쓰기 전 필수 — 미설정 시 createServiceRoleClient 는 즉시 throw */
export function isServiceRoleConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env[SUPABASE_SERVICE_ROLE_ENV]?.trim();
  return Boolean(url && key);
}

/**
 * 서버 전용 — RLS 우회.
 * 반드시 `NEXT_PUBLIC_SUPABASE_URL` + `process.env.SUPABASE_SERVICE_ROLE_KEY` 만 사용 (anon / 더미 클라이언트 금지).
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env[SUPABASE_SERVICE_ROLE_ENV]?.trim();
  if (!url || !key) {
    throw new Error(
      `createServiceRoleClient: NEXT_PUBLIC_SUPABASE_URL and ${SUPABASE_SERVICE_ROLE_ENV} must be set. Anon key must not be used for server-side writes.`,
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
