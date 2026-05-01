import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { tryCreateServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

type AdminAccessResult = false | { email: string };

function flagsFromProfileRow(profile: unknown): { role: string; isAdmin: boolean } {
  const role =
    typeof (profile as { role?: unknown } | null)?.role === 'string'
      ? (profile as { role?: string }).role!.trim().toLowerCase()
      : '';
  const isAdmin =
    typeof (profile as { is_admin?: unknown } | null)?.is_admin === 'boolean'
      ? Boolean((profile as { is_admin?: boolean }).is_admin)
      : false;
  return { role, isAdmin };
}

type ProfileAdminSignals = { isStaff: boolean; role: string; isAdmin: boolean };

/**
 * DB에 실제 있는 컬럼부터 읽는다. 이 레포 스키마에는 `is_staff`가 있고 `role`/`is_admin`은
 * 환경에 따라 없을 수 있어 — 한 번에 select 하면 전체가 실패하므로 분리 조회한다.
 */
async function readProfileAdminSignals(
  userId: string,
  sessionClient: SupabaseClient,
): Promise<ProfileAdminSignals | null> {
  async function readFrom(client: SupabaseClient): Promise<ProfileAdminSignals | null> {
    const { data: rowStaff, error: eStaff } = await client
      .from('profiles')
      .select('is_staff')
      .eq('id', userId)
      .maybeSingle();
    if (eStaff || !rowStaff) return null;

    const isStaff = Boolean((rowStaff as { is_staff?: boolean }).is_staff);

    const { data: rowExtra, error: eExtra } = await client
      .from('profiles')
      .select('role, is_admin')
      .eq('id', userId)
      .maybeSingle();

    if (!eExtra && rowExtra) {
      const f = flagsFromProfileRow(rowExtra);
      return { isStaff, role: f.role, isAdmin: f.isAdmin };
    }
    return { isStaff, role: '', isAdmin: false };
  }

  try {
    const svc = createServiceRoleClient();
    const fromSvc = await readFrom(svc);
    if (fromSvc) return fromSvc;
  } catch {
    /* dummy service client */
  }
  return readFrom(sessionClient);
}

/**
 * 이미 열린 Supabase(쿠키) 클라이언트 + userId + 정규화된 이메일로 관리자 여부만 판정.
 * `GlobalNav` 등에서 **동일 세션**으로 폴백 조회하며, DB 플래그는 service_role 우선.
 */
export async function resolveAdminForUser(
  supabase: SupabaseClient,
  userId: string,
  emailLower: string,
): Promise<AdminAccessResult> {
  const email = emailLower.trim().toLowerCase();
  if (!userId || !email || !email.includes('@')) return false;

  const sig = await readProfileAdminSignals(userId, supabase);
  if (sig) {
    const adminRole = sig.role === 'owner' || sig.role === 'super_admin' || sig.role === 'admin';
    if (sig.isStaff || sig.isAdmin || adminRole) {
      return { email };
    }
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
