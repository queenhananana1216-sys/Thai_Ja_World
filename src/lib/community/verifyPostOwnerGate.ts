import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyPostOwnerPassword } from '@/lib/community/postOwnerPassword';

export type PostOwnerGateResult =
  | 'ok'
  | 'no_gate'
  | 'password_required'
  | 'password_invalid'
  | 'gate_db_error';

/**
 * post_edit_secrets 가 있으면 owner_password 가 맞아야 통과.
 */
export async function verifyPostOwnerGate(
  admin: SupabaseClient,
  postId: string,
  ownerPassword: string | undefined,
): Promise<PostOwnerGateResult> {
  const { data: row, error } = await admin
    .from('post_edit_secrets')
    .select('password_hash')
    .eq('post_id', postId)
    .maybeSingle();

  if (error) {
    return 'gate_db_error';
  }
  if (!row?.password_hash) {
    return 'no_gate';
  }

  const pwd = ownerPassword?.trim() ?? '';
  if (!pwd) {
    return 'password_required';
  }
  if (!verifyPostOwnerPassword(pwd, String(row.password_hash))) {
    return 'password_invalid';
  }
  return 'ok';
}
