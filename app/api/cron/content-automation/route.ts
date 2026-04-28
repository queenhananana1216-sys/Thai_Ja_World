import { type NextRequest, NextResponse } from 'next/server';
import { runNewsIngestPipeline } from '@/bots/orchestrator/runNewsIngestPipeline';
import { isCronAuthorized } from '@/lib/cronAuth';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

type SnapshotRow = {
  source: 'weather' | 'exchange' | 'visa' | 'local';
  title: string;
  external_url: string;
  raw_body: string;
};

async function fetchSnapshots(now: Date): Promise<SnapshotRow[]> {
  const day = now.toISOString().slice(0, 10);
  const rows: SnapshotRow[] = [];

  const weatherRes = await fetch(
    'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,weather_code&timezone=Asia%2FBangkok',
    { cache: 'no-store' },
  );
  if (weatherRes.ok) {
    const weather = (await weatherRes.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    rows.push({
      source: 'weather',
      title: `[AUTO][WEATHER] Bangkok ${day}`,
      external_url: `internal://weather/bangkok/${day}`,
      raw_body: JSON.stringify({
        source: 'open-meteo',
        collected_at: now.toISOString(),
        city: 'Bangkok',
        current: weather.current ?? {},
      }),
    });
  }

  const fxRes = await fetch('https://open.er-api.com/v6/latest/THB', { cache: 'no-store' });
  if (fxRes.ok) {
    const fx = (await fxRes.json()) as { rates?: Record<string, number>; time_last_update_utc?: string };
    rows.push({
      source: 'exchange',
      title: `[AUTO][FX] THB/KRW snapshot ${day}`,
      external_url: `internal://exchange/thb-krw/${day}`,
      raw_body: JSON.stringify({
        source: 'open.er-api.com',
        collected_at: now.toISOString(),
        thb_krw: fx.rates?.KRW ?? null,
        updated_at_utc: fx.time_last_update_utc ?? null,
      }),
    });
  }

  const visaFeed = `https://news.google.com/rss/search?q=${encodeURIComponent(
    '태국 비자 한국인',
  )}&hl=ko&gl=TH&ceid=TH:ko`;
  rows.push({
    source: 'visa',
    title: `[AUTO][VISA] Thailand visa watch ${day}`,
    external_url: `internal://visa/watch/${day}`,
    raw_body: JSON.stringify({
      source: 'google-news-rss',
      collected_at: now.toISOString(),
      feed_url: visaFeed,
      note: 'Use regular /api/cron/news ingestion for article details.',
    }),
  });

  rows.push({
    source: 'local',
    title: `[AUTO][LOCAL] Thailand local brief ${day}`,
    external_url: `internal://local/brief/${day}`,
    raw_body: JSON.stringify({
      source: 'internal-snapshot',
      collected_at: now.toISOString(),
      channels: ['weather', 'exchange', 'visa'],
      intent: 'daily autonomous categorization',
    }),
  });

  return rows;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const admin = createServiceRoleClient();
    const snapshots = await fetchSnapshots(now);

    if (snapshots.length > 0) {
      const { error: upsertError } = await admin.from('raw_news').upsert(
        snapshots.map((s) => ({
          external_url: s.external_url,
          title: s.title,
          raw_body: s.raw_body,
          published_at: now.toISOString(),
        })),
        { onConflict: 'external_url' },
      );
      if (upsertError) throw new Error(upsertError.message);

      const { error: tipsError } = await admin.from('tips_articles').upsert(
        snapshots.map((s) => ({
          source_url: s.external_url,
          title: s.title,
          excerpt: `[AUTO][${s.source}] daily pipeline snapshot`,
          body_preview: s.raw_body.slice(0, 500),
          status: 'draft',
          published_at: null,
        })),
        { onConflict: 'source_url' },
      );
      if (tipsError) {
        console.warn('[API /api/cron/content-automation] tips upsert warning:', tipsError.message);
      }
    }

    const newsResult = await runNewsIngestPipeline({
      collect: { itemsPerFeed: 12 },
      process: { limit: 20 },
    });

    return NextResponse.json({
      status: 'ok',
      snapshots: snapshots.length,
      collect: newsResult.collect,
      process: newsResult.process,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/cron/content-automation]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
