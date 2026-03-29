import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Auth Admin listUsers 로 이메일 → user id(uuid) 조회 (대형 프로젝트는 전용 인덱스·RPC 권장)
 */
export async function resolveUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const perPage = 200;
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.trim().toLowerCase() === normalized);
    if (hit?.id) return hit.id;
    if (data.users.length < perPage) break;
  }
  return null;
}
