'use server';

import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export type SaveLocalMinihomeBgmResult =
  | { ok: true; charged: boolean; bgmUrl: string | null; thaiBalance: number }
  | { ok: false; reason: string; need?: number; have?: number };

export async function saveLocalMinihomeBgm(localSpotId: string, bgmUrlRaw: string): Promise<SaveLocalMinihomeBgmResult> {
  const id = localSpotId.trim();
  if (!id) {
    return { ok: false, reason: 'INVALID_SPOT' };
  }

  const sb = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return { ok: false, reason: 'NOT_AUTHENTICATED' };
  }

  const { data, error } = await sb.rpc('local_spot_save_minihome_bgm_with_dotori', {
    p_local_spot_id: id,
    p_bgm_url: bgmUrlRaw,
  });

  if (error) {
    return { ok: false, reason: error.message || 'RPC_ERROR' };
  }

  const row = data as Record<string, unknown> | null;
  if (!row || row.ok !== true) {
    const reason = typeof row?.reason === 'string' ? row.reason : 'UNKNOWN';
    const need = typeof row?.need === 'number' ? row.need : undefined;
    const have = typeof row?.have === 'number' ? row.have : undefined;
    return { ok: false, reason, need, have };
  }

  return {
    ok: true,
    charged: Boolean(row.charged),
    bgmUrl: typeof row.bgm_url === 'string' ? row.bgm_url : row.bgm_url == null ? null : String(row.bgm_url),
    thaiBalance: Number((row as { thai_balance?: unknown }).thai_balance ?? 0),
  };
}
