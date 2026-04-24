import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { recordQuestProgress } from '@/lib/quests/progress';

/**
 * 가입인사(말머리 intro) 첫 글 1회 — DB RPC로 dotori + signup_greeting_done.
 * (`apply_signup_greeting_from_community_post` 마이그레이션)
 */
export async function applyIntroSignupGreetingReward(input: {
  postId: string;
  profileId: string;
}): Promise<void> {
  const postId = input.postId?.trim();
  const profileId = input.profileId?.trim();
  if (!postId || !profileId) return;

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return;
  }

  let result: { data: unknown; error: { message?: string } | null };
  try {
    result = await admin.rpc('apply_signup_greeting_from_community_post', {
      p_post_id: postId,
      p_profile_id: profileId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn('[intro-greeting:rpc] skipped:', message);
    return;
  }

  if (result.error) {
    console.warn('[intro-greeting:rpc] error:', result.error.message ?? 'unknown');
    return;
  }

  const data = (result as { data: unknown }).data as
    | { ok?: boolean; reason?: string; points_granted?: number }
    | null;
  if (data?.ok) {
    try {
      await recordQuestProgress({
        profileId,
        eventType: 'write_post',
        amount: 1,
        source: 'community_intro_signup_greeting',
        dedupeKey: `intro_signup_greeting:${postId}`,
        metadata: { post_id: postId, points: data.points_granted ?? null },
      });
    } catch {
      // same as other quest hooks
    }
  }
}
