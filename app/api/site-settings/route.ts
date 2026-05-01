/**
 * 공개 UI 플래그 — 인증 없이 읽기 (캐시 짧게)
 */
import { NextResponse } from 'next/server';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';

export const runtime = 'nodejs';

export async function GET() {
  const s = await loadSiteUiSettings();
  return NextResponse.json(
    {
      ui: {
        text_scale: s.textScale,
        hide_ai_chrome: s.hideAiChrome,
        weather_widget_enabled: s.weatherWidgetEnabled,
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    },
  );
}
