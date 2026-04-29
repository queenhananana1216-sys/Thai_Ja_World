import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createDummySupabaseClient } from './dummy';

/** 서버 전용 — RLS 우회(벤·스트라이크 반영, 게시글 insert). 매 호출 새 클라이언트(환경 변수 갱신 반영). */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) {
    console.error('[admin] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다. dummy client 반환');
    return createDummySupabaseClient('admin');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
