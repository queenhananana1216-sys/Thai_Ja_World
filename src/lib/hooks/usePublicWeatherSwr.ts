'use client';

import useSWR, { preload } from 'swr';
import type { Locale } from '@/i18n/types';

export type WeatherCityApi = {
  key: string;
  temperature_c: number | null;
  weather_code?: number | null;
  condition: string;
};

export type WeatherApiPayload = {
  cities?: WeatherCityApi[];
  updated_at?: string;
  error?: string;
};

export async function weatherFetcher(url: string): Promise<WeatherApiPayload> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather_http');
  return res.json();
}

function weatherLocaleParam(locale: Locale): 'ko' | 'th' {
  return locale === 'th' ? 'th' : 'ko';
}

/**
 * `/api/weather`(Edge) — 세션 내 dedupe·캐시로 뒤로 가기 시 즉시 표시.
 */
export function usePublicWeatherSwr(locale: Locale) {
  const loc = weatherLocaleParam(locale);
  const key = `/api/weather?locale=${loc}`;
  return useSWR(key, weatherFetcher, {
    dedupingInterval: 300_000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
}

/** 디지털 메뉴판 등 인접 화면에서 홈과 동일 키로 캐시 워밍 */
export function prefetchPublicWeatherLocale(locale: Locale): void {
  const loc = weatherLocaleParam(locale);
  void preload(`/api/weather?locale=${loc}`, weatherFetcher);
}
