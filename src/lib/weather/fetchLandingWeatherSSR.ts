import 'server-only';

import {
  OPEN_METEO_THAILAND_URL,
  buildThailandCitiesWeather,
  parseOpenMeteoForecastBlocks,
  type OpenMeteoCityPayload,
} from '@/lib/weather/openMeteoThailand';
import type { Locale } from '@/i18n/types';

export type LandingWeatherResult = {
  cities: OpenMeteoCityPayload[];
  updatedAt: string | null;
  degraded: boolean;
};

/**
 * 랜딩 SSR용 — Open-Meteo 직접 fetch (Route Handler와 동일 URL·파싱).
 * 실패해도 throw 하지 않는다.
 */
export async function fetchLandingWeatherSSR(locale: Locale): Promise<LandingWeatherResult> {
  const loc = locale === 'th' ? 'th' : 'ko';
  try {
    const res = await fetch(OPEN_METEO_THAILAND_URL, { next: { revalidate: 600 } });
    if (!res.ok) {
      return { cities: [], updatedAt: null, degraded: true };
    }
    const data = (await res.json()) as unknown;
    const blocks = parseOpenMeteoForecastBlocks(data);
    const cities = buildThailandCitiesWeather(blocks, loc);
    return { cities, updatedAt: new Date().toISOString(), degraded: false };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[fetchLandingWeatherSSR] degraded:', err);
    }
    return { cities: [], updatedAt: null, degraded: true };
  }
}
