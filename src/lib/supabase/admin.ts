import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createDummySupabaseClient } from './dummy';

/** 프로덕션 쓰기 전 필수 — 미설정 시 더미 클라이언트로 조용히 실패하지 않도록 라우트에서 거부 */
export function isServiceRoleConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

/** 서버 전용 — RLS 우회. `createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)` 만 사용(anon 키 금지). */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) {
    console.warn('[admin] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다 — dummy client 반환');
    return createDummySupabaseClient('admin');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
