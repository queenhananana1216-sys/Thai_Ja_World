/**
 * 태국 3도시 실시간 날씨 — Open-Meteo (API 키 불필요)
 * https://open-meteo.com/
 */
import { NextResponse } from 'next/server';
import { fetchThailandCitiesWeather } from '@/lib/weather/fetchThailandCitiesWeather';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const loc = searchParams.get('locale') === 'th' ? 'th' : 'ko';
  const { cities, updatedAt } = await fetchThailandCitiesWeather(loc);
  if (cities.length === 0) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
  }
  return NextResponse.json({ cities, updated_at: updatedAt ?? new Date().toISOString() });
}
