/**
 * 일일 푸시 다이제스트용 — 방콕 현재 기온·상태 한 줄 (Open-Meteo, 키 불필요)
 */
import { wmoLabel } from '@/lib/weather/wmoWeatherCode';

const BKK_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,weather_code&timezone=Asia%2FBangkok';

export type BangkokWeatherPair = { ko: string; th: string };

export async function fetchBangkokWeatherPairForPush(): Promise<BangkokWeatherPair | null> {
  try {
    const res = await fetch(BKK_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const temp = data.current?.temperature_2m;
    const code = data.current?.weather_code;
    if (typeof temp !== 'number') return null;
    const t = Math.round(temp * 10) / 10;
    return {
      ko: `방콕 ${t}°C · ${wmoLabel(code, 'ko')}`,
      th: `กรุงเทพฯ ${t}°C · ${wmoLabel(code, 'th')}`,
    };
  } catch {
    return null;
  }
}
