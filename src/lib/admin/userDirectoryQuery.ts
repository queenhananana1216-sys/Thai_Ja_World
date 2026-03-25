import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';

export type AdminUserDirectoryRow = {
  profile_id: string;
  display_name: string | null;
  admin_search: string;
  is_staff: boolean;
  banned_until: string | null;
  moderation_strikes: number;
  created_at: string;
  last_seen_at: string | null;
  reports_on_profile: number;
  reports_on_posts: number;
  reports_on_comments: number;
  reports_total: number;
};

const DEFAULT_LIMIT = 200;

/** RPC 인자용 — 길이만 제한 (SQL은 파라미터 바인딩으로 이스케이프) */
function clampQuery(raw: string): string {
  return raw.trim().slice(0, 120);
}

/**
 * service_role + admin_user_directory_search RPC
 */
export async function queryUserDirectory(params: {
  q?: string;
  sort: 'reports' | 'created' | 'last_seen';
  limit?: number;
}): Promise<AdminUserDirectoryRow[]> {
  const admin = createServiceRoleClient();
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), 500);
  const q = params.q ? clampQuery(params.q) : '';

  const { data, error } = await admin.rpc('admin_user_directory_search', {
    p_query: q.length > 0 ? q : null,
    p_sort: params.sort,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`[userDirectoryQuery] ${error.message}`);
  }

  return (data ?? []) as AdminUserDirectoryRow[];
}
