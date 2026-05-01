import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { tryCreateServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

type AdminAccessResult = false | { email: string };

/**
 * 이미 열린 Supabase(쿠키) 클라이언트 + userId + 정규화된 이메일로 관리자 여부만 판정.
 * `GlobalNav` 등에서 **동일 세션 클라이언트**로 호출해 `/admin` 레이아웃과 결과를 맞춘다.
 */
export async function resolveAdminForUser(
  supabase: SupabaseClient,
  userId: string,
  emailLower: string,
): Promise<AdminAccessResult> {
  const email = emailLower.trim().toLowerCase();
  if (!userId || !email || !email.includes('@')) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', userId)
    .maybeSingle();

  const role =
    typeof (profile as { role?: unknown } | null)?.role === 'string'
      ? (profile as { role?: string }).role!.trim().toLowerCase()
      : '';
  const isAdminFlag =
    typeof (profile as { is_admin?: unknown } | null)?.is_admin === 'boolean'
      ? Boolean((profile as { is_admin?: boolean }).is_admin)
      : false;
  const adminRole = role === 'owner' || role === 'super_admin' || role === 'admin';

  if (isAdminFlag || adminRole) {
    return { email };
  }

  const ownerIds =
    process.env.ADMIN_OWNER_USER_IDS?.split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (ownerIds.length > 0 && ownerIds.includes(userId)) {
    return { email };
  }

  const ownerEmails = parseAdminAllowedEmails();
  return ownerEmails.includes(email) ? { email } : false;
}

/**
 * 최고 관리자(오너) 또는 관리자 프로필만 통과.
 *
 * 루트 레이아웃이 매 요청 호출하므로 **절대 throw 하지 않는다**.
 * env 누락 / 네트워크 오류 / 쿠키 파싱 실패 모두 `false`로 흡수.
 */
export async function resolveAdminAccess(): Promise<AdminAccessResult> {
  try {
    const supabase = await tryCreateServerSupabaseAuthClient();
    if (!supabase) return false;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) return false;
    const userId = user?.id;
    const raw = user?.email?.trim().toLowerCase();
    if (!userId || !raw) return false;

    return resolveAdminForUser(supabase, userId, raw);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[resolveAdminAccess] 예외 — false 반환', err);
    }
    return false;
  }
}
