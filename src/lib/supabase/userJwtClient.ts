import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** API 라우트에서 Authorization: Bearer <access_token> 으로 RLS 적용 클라이언트 */
export function createSupabaseWithUserJwt(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error('[userJwt] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 필요');
  }
  const token = accessToken.trim();
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
