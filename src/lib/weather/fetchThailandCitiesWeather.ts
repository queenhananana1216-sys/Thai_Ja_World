import 'server-only';

import { wmoLabel } from '@/lib/weather/wmoWeatherCode';
import type { Locale } from '@/i18n/types';

export type ThailandCityWeather = {
  key: 'bangkok' | 'pattaya' | 'chiang_mai';
  temperature_c: number | null;
  weather_code: number | null;
  condition: string;
};

/**
 * Open-Meteo 3 cities (same query as /api/weather) — for SSR on landing.
 * Never throws; returns empty cities on failure.
 */
export async function fetchThailandCitiesWeather(
  locale: Locale,
): Promise<{ cities: ThailandCityWeather[]; updatedAt: string | null }> {
  const loc = locale === 'th' ? 'th' : 'ko';
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=13.7563,12.9236,18.7883&longitude=100.5018,100.8825,98.9853' +
    '&current=temperature_2m,weather_code&timezone=Asia%2FBangkok';
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return { cities: [], updatedAt: null };
    const data = (await res.json()) as unknown;
    const list = Array.isArray(data)
      ? data
      : data && typeof data === 'object'
        ? Object.values(data as Record<string, unknown>)
        : [];
    const cityKeys = ['bangkok', 'pattaya', 'chiang_mai'] as const;
    const cities: ThailandCityWeather[] = cityKeys.map((key, i) => {
      const block = list[i] as { current?: { temperature_2m?: number; weather_code?: number } } | undefined;
      const cur = block?.current;
      const temp =
        typeof cur?.temperature_2m === 'number' ? Math.round(cur.temperature_2m * 10) / 10 : null;
      const code = typeof cur?.weather_code === 'number' ? cur.weather_code : undefined;
      return {
        key,
        temperature_c: temp,
        weather_code: code ?? null,
        condition: wmoLabel(code, loc),
      };
    });
    return { cities, updatedAt: new Date().toISOString() };
  } catch {
    return { cities: [], updatedAt: null };
  }
}
