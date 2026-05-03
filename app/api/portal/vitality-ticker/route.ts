import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { buildPortalVitalityTickerLines } from '@/lib/vitality/portalTickerLines';
import type { Locale } from '@/i18n/types';

export const runtime = 'nodejs';

const cachedTicker = unstable_cache(
  async (locale: Locale) => buildPortalVitalityTickerLines(locale),
  ['portal-vitality-ticker-v1'],
  { revalidate: 3600 },
);

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const locale: Locale = searchParams.get('locale') === 'th' ? 'th' : 'ko';
  try {
    const lines = await cachedTicker(locale);
    return NextResponse.json(
      { ok: true as const, lines, generated_at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ ok: false as const, reason: 'TICKER_BUILD_FAILED', message: msg }, { status: 500 });
  }
}
