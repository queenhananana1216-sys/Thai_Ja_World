/**
 * supabaseClient.ts — 서버 전용 Supabase 클라이언트 (「태국에, 살자」봇 시스템)
 *
 * !! 주의 !!
 *   - 이 모듈은 서버(Node.js) 런타임에서만 실행되어야 합니다.
 *   - SUPABASE_SERVICE_ROLE_KEY 는 절대 브라우저에 노출되어서는 안 됩니다.
 *   - 파이프라인 쓰기는 anon 이 아니라 `@/lib/supabase/admin` 과 동일하게 서비스 롤만 사용합니다.
 *
 * 환경 변수 (`.env.local`):
 *   NEXT_PUBLIC_SUPABASE_URL      — Supabase 프로젝트 URL
 *   SUPABASE_SERVICE_ROLE_KEY     — Service Role 키 (RLS 우회, 쓰기 전용 목적)
 */

/** Next 앱 외부(tsx CLI 등)에서도 봇을 돌릴 수 있게 server-only 미사용 — 이 모듈은 API·봇에서만 import 할 것 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient, SUPABASE_SERVICE_ROLE_ENV } from '@/lib/supabase/admin';

let _client: SupabaseClient | null = null;

/**
 * 서버 전용 Supabase 클라이언트 — `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` 단일 경로 (anon 금지).
 */
export function getServerSupabaseClient(): SupabaseClient {
  if (!process.env[SUPABASE_SERVICE_ROLE_ENV]?.trim()) {
    throw new Error(
      `getServerSupabaseClient: ${SUPABASE_SERVICE_ROLE_ENV} is required for bot/cron DB writes.`,
    );
  }
  if (_client) return _client;
  _client = createServiceRoleClient();
  return _client;
}
