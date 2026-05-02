import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** 프로덕션 쓰기 전 필수 — 미설정 시 createServiceRoleClient 는 즉시 throw */
export function isServiceRoleConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

/**
 * 서버 전용 — RLS 우회.
 * 반드시 `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` 만 사용 (anon / 더미 클라이언트 금지).
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'createServiceRoleClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Anon key must not be used for server-side writes.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
