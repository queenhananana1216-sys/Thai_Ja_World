/**
 * 태국 3도시 실시간 날씨 — Open-Meteo (API 키 불필요)
 * https://open-meteo.com/
 */
import { NextResponse } from 'next/server';
import { wmoLabel } from '@/lib/weather/wmoWeatherCode';

export const runtime = 'nodejs';

const LATS = '13.7563,12.9236,18.7883';
const LONS = '100.5018,100.8825,98.9853';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const loc = searchParams.get('locale') === 'th' ? 'th' : 'ko';

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LATS}&longitude=${LONS}` +
    '&current=temperature_2m,weather_code&timezone=Asia%2FBangkok';

  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) {
      return NextResponse.json({ error: 'upstream', status: res.status }, { status: 502 });
    }
    const data = (await res.json()) as unknown;
    const list = Array.isArray(data)
      ? data
      : data && typeof data === 'object'
        ? Object.values(data as Record<string, unknown>)
        : [];
    const cities = ['bangkok', 'pattaya', 'chiang_mai'] as const;
    const out = cities.map((key, i) => {
      const block = list[i] as { current?: { temperature_2m?: number; weather_code?: number } } | undefined;
      const cur = block?.current;
      const temp = typeof cur?.temperature_2m === 'number' ? Math.round(cur.temperature_2m * 10) / 10 : null;
      const code = typeof cur?.weather_code === 'number' ? cur.weather_code : undefined;
      return {
        key,
        temperature_c: temp,
        weather_code: code ?? null,
        condition: wmoLabel(code, loc),
      };
    });
    return NextResponse.json({ cities: out, updated_at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
  }
}
