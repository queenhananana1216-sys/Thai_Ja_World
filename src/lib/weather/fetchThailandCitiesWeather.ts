import 'server-only';

import { wmoLabel } from '@/lib/weather/wmoWeatherCode';
import type { Locale } from '@/i18n/types';
import { isThailandWeatherSnapshotComplete } from '@/lib/weather/thailandWeatherSnapshot';

export type ThailandCityWeather = {
  key: 'bangkok' | 'pattaya' | 'chiang_mai';
  temperature_c: number | null;
  weather_code: number | null;
  condition: string;
};

export { isThailandWeatherSnapshotComplete };

export type FetchThailandWeatherOptions = {
  /** 기본 ISR(60s). 헬스·프로브는 `no-store` 로 캐시된 실패/스텔스를 피한다. */
  cache?: RequestCache;
  revalidate?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchThailandCitiesWeatherOnce(
  locale: Locale,
  fetchInit: RequestInit,
): Promise<{ cities: ThailandCityWeather[]; updatedAt: string | null }> {
  const loc = locale === 'th' ? 'th' : 'ko';
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=13.7563,12.9236,18.7883&longitude=100.5018,100.8825,98.9853' +
    '&current=temperature_2m,weather_code&timezone=Asia%2FBangkok';
  const res = await fetch(url, fetchInit);
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
}

/**
 * Open-Meteo 3 cities (same query as /api/weather) — for SSR on landing.
 * Never throws; returns empty cities on failure. no-store 시 불완전 응답에 재시도.
 */
export async function fetchThailandCitiesWeather(
  locale: Locale,
  opts?: FetchThailandWeatherOptions,
): Promise<{ cities: ThailandCityWeather[]; updatedAt: string | null }> {
  const fetchInit: RequestInit =
    opts?.cache === 'no-store'
      ? { cache: 'no-store' }
      : { next: { revalidate: typeof opts?.revalidate === 'number' ? opts.revalidate : 60 } };
  const maxAttempts = opts?.cache === 'no-store' ? 5 : 2;
  let last: { cities: ThailandCityWeather[]; updatedAt: string | null } = { cities: [], updatedAt: null };
  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      last = await fetchThailandCitiesWeatherOnce(locale, fetchInit);
      if (isThailandWeatherSnapshotComplete(last.cities)) return last;
      if (attempt < maxAttempts - 1) await sleep(320 * (attempt + 1));
    }
    return last;
  } catch {
    return { cities: [], updatedAt: null };
  }
}
