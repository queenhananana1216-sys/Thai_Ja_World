import 'server-only';

import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { tryCreateServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

/**
 * 최고 관리자(오너) 또는 관리자 프로필만 통과.
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
    const userId = user?.id;
    const email = user?.email?.trim().toLowerCase();
    if (!email || !userId) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', userId)
      .maybeSingle();

    const role =
      typeof (profile as { role?: unknown } | null)?.role === 'string'
        ? (profile as { role?: string }).role!.trim().toLowerCase()
        : '';
    const isAdmin =
      typeof (profile as { is_admin?: unknown } | null)?.is_admin === 'boolean'
        ? Boolean((profile as { is_admin?: boolean }).is_admin)
        : false;
    const adminRole = role === 'owner' || role === 'super_admin' || role === 'admin';

    if (isAdmin || adminRole) {
      return { email };
    }

    const ownerEmails = parseAdminAllowedEmails();
    return ownerEmails.includes(email) ? { email } : false;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[resolveAdminAccess] 예외 — false 반환', err);
    }
    return false;
  }
}
