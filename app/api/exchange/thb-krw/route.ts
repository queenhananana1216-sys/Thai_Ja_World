/**
 * THB → KRW 요약 시세 — Frankfurter(ECB) 우선, 실패 시 CDN currency-api 폴백.
 * Next fetch 캐시로 시간당 재검증(트래픽·속도 균형).
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** ISR 스타일 캐시 — CDN·엣지에서 빠른 반복 조회 */
export const revalidate = 3600;

type RatePayload = {
  rate: number;
  /** 기준일 (공급원 문서 기준) */
  date: string;
  source: 'frankfurter' | 'currency-api';
};

async function fetchFrankfurter(): Promise<RatePayload | null> {
  const res = await fetch('https://api.frankfurter.app/latest?from=THB&to=KRW', {
    next: { revalidate },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { rates?: { KRW?: number }; date?: string };
  const rate = j?.rates?.KRW;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;
  return { rate, date: typeof j.date === 'string' ? j.date : '', source: 'frankfurter' };
}

async function fetchCurrencyApiFallback(): Promise<RatePayload | null> {
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/thb.json',
    { next: { revalidate }, headers: { Accept: 'application/json' } },
  );
  if (!res.ok) return null;
  const j = (await res.json()) as { date?: string; thb?: Record<string, number> };
  const rate = j?.thb?.krw;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;
  const date = typeof j.date === 'string' ? j.date : '';
  return { rate, date, source: 'currency-api' };
}

export async function GET(): Promise<NextResponse> {
  try {
    const primary = await fetchFrankfurter();
    const payload = primary ?? (await fetchCurrencyApiFallback());
    if (!payload) {
      return NextResponse.json({ error: 'rate_unavailable' }, { status: 503 });
    }
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
