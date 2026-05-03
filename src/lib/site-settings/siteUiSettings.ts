import 'server-only';

import { unstable_cache } from 'next/cache';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_SITE_DISPLAY_NAME } from '@/lib/site-brand/constants';

export type TextScale = 'compact' | 'normal' | 'large';

export type SiteUiSettings = {
  /** 헤더·푸터·메타 — `brand.site_display_name` 우선, 없으면 `NEXT_PUBLIC_SITE_NAME` */
  siteDisplayName: string;
  textScale: TextScale;
  hideAiChrome: boolean;
  weatherWidgetEnabled: boolean;
  /** DB 다운 등으로 자동/수동 설정된 읽기 위주 모드 */
  healthSafeMode: boolean;
};

const DEFAULTS: SiteUiSettings = {
  siteDisplayName: DEFAULT_SITE_DISPLAY_NAME,
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

function parseSiteDisplayNameFromMap(map: Map<string, unknown>): string {
  const raw = map.get('brand.site_display_name');
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.length > 0) return t.slice(0, 120);
  }
  const env = process.env.NEXT_PUBLIC_SITE_NAME?.trim();
  if (env && env.length > 0) return env.slice(0, 120);
  return DEFAULT_SITE_DISPLAY_NAME;
}

const loadSiteUiSettingsImpl = async (): Promise<SiteUiSettings> => {
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
      siteDisplayName: parseSiteDisplayNameFromMap(map),
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
};

export const SITE_UI_SETTINGS_CACHE_TAG = 'site-ui-settings' as const;

const getCachedSiteUiSettings = unstable_cache(loadSiteUiSettingsImpl, ['site-ui-settings-v2'], {
  revalidate: 30,
  tags: [SITE_UI_SETTINGS_CACHE_TAG],
});

/** RSC·레이아웃용 — 실패 시 DEFAULTS (마이그레이션 전·오프라인에도 앱이 죽지 않게) */
export async function loadSiteUiSettings(): Promise<SiteUiSettings> {
  return getCachedSiteUiSettings();
}

export function siteUiDefaults(): SiteUiSettings {
  return { ...DEFAULTS };
}
