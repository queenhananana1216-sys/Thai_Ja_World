import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export type VerifyAuthorResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; code: string };

export async function verifyBearerOwnsPost(
  accessToken: string,
  postId: string,
): Promise<VerifyAuthorResult> {
  const token = accessToken.trim();
  if (!token) {
    return { ok: false, status: 401, code: 'auth' };
  }
  let userId: string;
  try {
    const sb = createSupabaseWithUserJwt(token);
    const { data: u, error: ue } = await sb.auth.getUser();
    if (ue || !u.user) {
      return { ok: false, status: 401, code: 'auth' };
    }
    userId = u.user.id;
  } catch {
    return { ok: false, status: 401, code: 'auth' };
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return { ok: false, status: 503, code: 'server' };
  }

  const { data: row, error } = await admin
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, status: 404, code: 'not_found' };
  }
  if (String((row as { author_id: string }).author_id) !== userId) {
    return { ok: false, status: 403, code: 'forbidden' };
  }

  return { ok: true, userId };
}
