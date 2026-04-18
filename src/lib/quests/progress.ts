import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';

type ProgressInput = {
  profileId: string;
  eventType: string;
  amount?: number;
  source?: string;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
};

export async function recordQuestProgress(input: ProgressInput): Promise<void> {
  const profileId = input.profileId?.trim();
  const eventType = input.eventType?.trim();
  if (!profileId || !eventType) return;

  try {
    const admin = createServiceRoleClient();
    await admin.rpc('quest_record_progress', {
      p_profile_id: profileId,
      p_event_type: eventType,
      p_amount: Math.max(1, Math.floor(input.amount ?? 1)),
      p_source: input.source?.trim() || 'app',
      p_dedupe_key: input.dedupeKey?.trim() || null,
      p_metadata: input.metadata ?? {},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[quest:recordQuestProgress] skipped:', message);
  }
}
