import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type TextScale = 'compact' | 'normal' | 'large';

export type SiteUiSettings = {
  textScale: TextScale;
  hideAiChrome: boolean;
  weatherWidgetEnabled: boolean;
  /** DB 다운 등으로 자동/수동 설정된 읽기 위주 모드 */
  healthSafeMode: boolean;
};

const DEFAULTS: SiteUiSettings = {
  textScale: 'normal',
  hideAiChrome: false,
  weatherWidgetEnabled: true,
  healthSafeMode: false,
};

function createReadonlyAnon(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function parseTextScale(v: unknown): TextScale {
  if (v === 'compact' || v === 'normal' || v === 'large') return v;
  return 'normal';
}

function parseBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** RSC·레이아웃용 — 실패 시 DEFAULTS (마이그레이션 전·오프라인에도 앱이 죽지 않게) */
export async function loadSiteUiSettings(): Promise<SiteUiSettings> {
  const sb = createReadonlyAnon();
  if (!sb) return { ...DEFAULTS };
  try {
    const { data, error } = await sb.from('site_settings').select('key, value');
    if (error || !Array.isArray(data)) return { ...DEFAULTS };
    const map = new Map<string, unknown>();
    for (const row of data as { key: string; value: unknown }[]) {
      if (row?.key) map.set(row.key, row.value);
    }
    return {
      textScale: parseTextScale(map.get('ui.text_scale')),
      hideAiChrome: parseBool(map.get('ui.hide_ai_chrome'), DEFAULTS.hideAiChrome),
      weatherWidgetEnabled: parseBool(
        map.get('ui.weather_widget_enabled'),
        DEFAULTS.weatherWidgetEnabled,
      ),
      healthSafeMode: parseBool(map.get('health.safe_mode'), DEFAULTS.healthSafeMode),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function siteUiDefaults(): SiteUiSettings {
  return { ...DEFAULTS };
}
