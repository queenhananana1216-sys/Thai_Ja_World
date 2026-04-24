/**
 * Open-Meteo /v1/forecast — Thailand 3 cities (Bangkok, Pattaya, Chiang Mai).
 * Multi-location responses are a JSON **array** of per-location objects; a single
 * location is one object. Never use Object.values on a single object (key order is undefined).
 */
import { wmoLabel } from '@/lib/weather/wmoWeatherCode';

export const OPEN_METEO_THAILAND_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=13.7563,12.9236,18.7883&longitude=100.5018,100.8825,98.9853' +
  '&current=temperature_2m,weather_code&timezone=Asia%2FBangkok';

export const TH_CITY_KEYS = ['bangkok', 'pattaya', 'chiang_mai'] as const;
export type ThailandCityKey = (typeof TH_CITY_KEYS)[number];

export type OpenMeteoCityPayload = {
  key: ThailandCityKey;
  temperature_c: number | null;
  weather_code: number | null;
  condition: string;
};

type CurrentBlock = { temperature_2m?: number; weather_code?: number } | undefined;

type ForecastBlock = { current?: CurrentBlock };

function isForecastBlock(x: unknown): x is ForecastBlock {
  return x !== null && typeof x === 'object' && 'current' in (x as object);
}

/** Normalize Open-Meteo JSON to 0..3 blocks in fixed city order (or fewer if upstream returns fewer). */
export function parseOpenMeteoForecastBlocks(data: unknown): ForecastBlock[] {
  if (Array.isArray(data)) {
    return data.filter(isForecastBlock);
  }
  if (data && typeof data === 'object' && isForecastBlock(data)) {
    return [data];
  }
  return [];
}

export function buildThailandCitiesWeather(
  blocks: ForecastBlock[],
  locale: 'ko' | 'th',
): OpenMeteoCityPayload[] {
  return TH_CITY_KEYS.map((key, i) => {
    const block = blocks[i];
    const cur = block?.current;
    const temp =
      typeof cur?.temperature_2m === 'number' ? Math.round(cur.temperature_2m * 10) / 10 : null;
    const code = typeof cur?.weather_code === 'number' ? cur.weather_code : undefined;
    return {
      key,
      temperature_c: temp,
      weather_code: code ?? null,
      condition: wmoLabel(code, locale),
    };
  });
}
