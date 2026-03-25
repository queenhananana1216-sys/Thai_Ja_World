import type { FxSnapshot } from '@/lib/fx/types';

export type FxFetchInit = RequestInit & { next?: { revalidate?: number } };

/** SSR·개발 모드 스킵 시 클라이언트가 /api/fx 로 갱신 */
export const FX_SNAPSHOT_FALLBACK: FxSnapshot = {
  usdToThb: 35.6,
  usdToKrw: 1470,
  dateISO: new Date().toISOString(),
  mock: true,
};

const FALLBACK = FX_SNAPSHOT_FALLBACK;

/**
 * USD 기준 THB·KRW 환율 (Frankfurter / ECB, 무료·키 불필요)
 * - 홈 SSR: `fetchUsdFx({ next: { revalidate: 1800 } })`
 * - API 새로고침: `fetchUsdFx({ cache: 'no-store' })`
 */
export async function fetchUsdFx(reqInit?: FxFetchInit): Promise<FxSnapshot> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=THB,KRW', {
      ...reqInit,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ...FALLBACK, dateISO: new Date().toISOString() };
    const j = (await res.json()) as {
      rates?: { THB?: number; KRW?: number };
      date?: string;
    };
    const th = j.rates?.THB;
    const kr = j.rates?.KRW;
    if (typeof th !== 'number' || typeof kr !== 'number' || th <= 0 || kr <= 0) {
      return { ...FALLBACK, dateISO: new Date().toISOString() };
    }
    const dateISO = j.date ? `${j.date}T12:00:00.000Z` : new Date().toISOString();
    return { usdToThb: th, usdToKrw: kr, dateISO, mock: false };
  } catch {
    return { ...FALLBACK, dateISO: new Date().toISOString() };
  }
}
