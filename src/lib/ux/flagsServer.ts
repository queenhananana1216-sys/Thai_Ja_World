import 'server-only';
import { createServerClient } from '@/lib/supabase/server';
import type { UxFlagMap } from '@/lib/ux/types';

type FlagRow = {
  flag_key: string;
  flag_value: unknown;
};

export async function getActiveUxFlagsServer(): Promise<UxFlagMap> {
  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('ux_flag_overrides')
      .select('flag_key, flag_value')
      .eq('active', true);
    if (error) return {};
    const map: UxFlagMap = {};
    for (const row of (data ?? []) as FlagRow[]) {
      map[row.flag_key] =
        row.flag_value && typeof row.flag_value === 'object' && !Array.isArray(row.flag_value)
          ? (row.flag_value as Record<string, unknown>)
          : {};
    }
    return map;
  } catch {
    return {};
  }
}

