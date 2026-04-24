import 'server-only';

import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { tryCreateServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

/**
 * 로그인 + (화이트리스트 비어 있으면 개발용으로 모든 로그인 사용자 허용).
 *
 * 루트 레이아웃이 매 요청 호출하므로 **절대 throw 하지 않는다**.
 * env 누락 / 네트워크 오류 / 쿠키 파싱 실패 모두 `false`로 흡수.
 */
export async function resolveAdminAccess(): Promise<false | { email: string }> {
  try {
    const supabase = await tryCreateServerSupabaseAuthClient();
    if (!supabase) return false;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) return false;
    const email = user?.email?.trim().toLowerCase();
    if (!email) return false;

    const allowed = parseAdminAllowedEmails();
    if (allowed.length > 0) {
      return allowed.includes(email) ? { email } : false;
    }
    return { email };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[resolveAdminAccess] 예외 — false 반환', err);
    }
    return false;
  }
}
