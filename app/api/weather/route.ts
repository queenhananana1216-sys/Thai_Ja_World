/**
 * 태국 3도시 실시간 날씨 — Open-Meteo (API 키 불필요)
 * https://open-meteo.com/
 */
import { NextResponse } from 'next/server';
import { fetchThailandCitiesWeather } from '@/lib/weather/fetchThailandCitiesWeather';

/** Open-Meteo 프록시만 사용 — Edge 에서 저지연 응답 */
export const runtime = 'edge';
/** 포털 날씨 위젯·프록시 응답 60초 ISR (Open-Meteo 페치도 동일 revalidate) */
export const revalidate = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const loc = searchParams.get('locale') === 'th' ? 'th' : 'ko';
  const { cities, updatedAt } = await fetchThailandCitiesWeather(loc);
  if (cities.length === 0) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
  }
  return NextResponse.json({ cities, updated_at: updatedAt ?? new Date().toISOString() });
}
