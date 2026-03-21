/**
 * supabaseClient.ts — 서버 전용 Supabase 클라이언트 (태자 월드 봇 시스템)
 *
 * !! 주의 !!
 *   - 이 모듈은 서버(Node.js) 런타임에서만 실행되어야 합니다.
 *   - SUPABASE_SERVICE_ROLE_KEY 는 절대 브라우저에 노출되어서는 안 됩니다.
 *   - "server-only" 패키지가 클라이언트 번들 포함 시 빌드 오류를 발생시킵니다.
 *
 * 환경 변수 (`.env.local`):
 *   NEXT_PUBLIC_SUPABASE_URL      — Supabase 프로젝트 URL
 *   SUPABASE_SERVICE_ROLE_KEY     — Service Role 키 (RLS 우회, 쓰기 전용 목적)
 */

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── 환경 변수 검증 ─────────────────────────────────────────────────────────

function resolveEnv(): { url: string; serviceRoleKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      '[BotSystem] 환경 변수 NEXT_PUBLIC_SUPABASE_URL 이 설정되지 않았습니다.\n' +
        '.env.local 파일을 확인하세요.',
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      '[BotSystem] 환경 변수 SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다.\n' +
        '.env.local 파일을 확인하세요. (이 키는 절대 브라우저에 노출 금지)',
    );
  }

  return { url, serviceRoleKey };
}

// ── 싱글톤 클라이언트 (Node 모듈 캐시 활용) ────────────────────────────────

// 제네릭 Database 타입은 Phase 2에서 `supabase gen types` 로 생성된 파일로 교체 예정
let _client: SupabaseClient | null = null;

/**
 * 서버 전용 Supabase 클라이언트 반환.
 * 세션 & 자동 갱신을 비활성화하여 봇 워커에 최적화됨.
 */
export function getServerSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const { url, serviceRoleKey } = resolveEnv();

  _client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return _client;
}
