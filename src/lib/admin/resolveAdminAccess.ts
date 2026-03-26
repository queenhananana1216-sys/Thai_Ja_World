import 'server-only';

import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

/** 로그인 + (화이트리스트 비어 있으면 개발용으로 모든 로그인 사용자 허용) */
export async function resolveAdminAccess(): Promise<false | { email: string }> {
  const supabase = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;

  const allowed = parseAdminAllowedEmails();
  if (allowed.length > 0) {
    return allowed.includes(email) ? { email } : false;
  }
  return { email };
}
