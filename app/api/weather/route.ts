/**
 * 태국 3도시 실시간 날씨 — Open-Meteo (API 키 불필요)
 * https://open-meteo.com/
 */
import { NextResponse } from 'next/server';
import { OPEN_METEO_THAILAND_URL, buildThailandCitiesWeather, parseOpenMeteoForecastBlocks } from '@/lib/weather/openMeteoThailand';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const loc = searchParams.get('locale') === 'th' ? 'th' : 'ko';

  try {
    const res = await fetch(OPEN_METEO_THAILAND_URL, { next: { revalidate: 600 } });
    if (!res.ok) {
      return NextResponse.json({ error: 'upstream', status: res.status }, { status: 502 });
    }
    const data = (await res.json()) as unknown;
    const blocks = parseOpenMeteoForecastBlocks(data);
    const out = buildThailandCitiesWeather(blocks, loc);
    return NextResponse.json({ cities: out, updated_at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
  }
}
