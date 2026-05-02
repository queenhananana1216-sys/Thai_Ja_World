import { type NextRequest, NextResponse } from 'next/server';
import { runNewsIngestPipeline } from '@/bots/orchestrator/runNewsIngestPipeline';
import { isCronAuthorized } from '@/lib/cronAuth';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { findActivePause, logCronEvent, pausedResponse, registerFailureAndSelfHeal } from '@/lib/cron/omniLogger';
import { sanitizeAiKoreanPhrases, sanitizeAiThaiPhrases } from '@/lib/text/normalizeDisplayText';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** 뉴스·스냅샷 등 연속 작업 — cron/news·pipeline 과 동일 상한으로 타임아웃 여유 */
export const maxDuration = 300;

type SnapshotRow = {
  source: 'weather' | 'exchange' | 'visa' | 'local';
  title: string;
  external_url: string;
  raw_body: string;
};

type SnapshotMetrics = {
  weatherSummary: string | null;
  exchangeSummary: string | null;
  errors: string[];
};

type FetchJsonResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};

type ProcessedNewsBody = {
  ko?: { title?: string; summary?: string; blurb?: string; editor_note?: string };
  th?: { title?: string; summary?: string; blurb?: string; editor_note?: string };
  source_url?: string;
};

const FETCH_TIMEOUT_MS = 15_000;
const CONTENT_AUTOMATION_LOCK_MS = 60_000;

function sanitizeProcessedBody(raw: string | null): string | null {
  if (!raw?.trim()) return raw;
  try {
    const parsed = JSON.parse(raw) as ProcessedNewsBody;
    const clean = {
      ...parsed,
      ko: parsed.ko
        ? {
            ...parsed.ko,
            title: sanitizeAiKoreanPhrases(parsed.ko.title ?? ''),
            summary: sanitizeAiKoreanPhrases(parsed.ko.summary ?? ''),
            blurb: sanitizeAiKoreanPhrases(parsed.ko.blurb ?? ''),
            editor_note: sanitizeAiKoreanPhrases(parsed.ko.editor_note ?? ''),
          }
        : parsed.ko,
      th: parsed.th
        ? {
            ...parsed.th,
            title: sanitizeAiThaiPhrases(parsed.th.title ?? ''),
            summary: sanitizeAiThaiPhrases(parsed.th.summary ?? ''),
            blurb: sanitizeAiThaiPhrases(parsed.th.blurb ?? ''),
            editor_note: sanitizeAiThaiPhrases(parsed.th.editor_note ?? ''),
          }
        : parsed.th,
    };
    return JSON.stringify(clean);
  } catch {
    return raw;
  }
}

async function runSanitizationPass(admin: ReturnType<typeof createServiceRoleClient>): Promise<number> {
  const { data, error } = await admin
    .from('processed_news')
    .select('id, clean_body')
    .order('created_at', { ascending: false })
    .limit(40);
  if (error || !data?.length) return 0;

  let updated = 0;
  for (const row of data) {
    const before = typeof row.clean_body === 'string' ? row.clean_body : null;
    const after = sanitizeProcessedBody(before);
    if (!before || !after || before === after) continue;
    const { error: updateError } = await admin
      .from('processed_news')
      .update({ clean_body: after })
      .eq('id', String(row.id));
    if (!updateError) updated += 1;
  }
  return updated;
}

function cronSecret(): string {
  return process.env.CRON_SECRET?.trim() || process.env.BOT_CRON_SECRET?.trim() || '';
}

function readAndMaskForceKey(req: NextRequest): string {
  const key = new URL(req.url).searchParams.get('key')?.trim() || '';
  if (key) {
    console.log('[API /api/cron/content-automation] manual key provided (masked)');
  }
  return key;
}

async function fetchJsonWithTimeout<T>(apiName: string, url: string): Promise<FetchJsonResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, */*',
        'User-Agent': 'TaejaWorld-Cron/1.0 (+content-automation)',
      },
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      return { ok: false, status: res.status, error: `[${apiName}] HTTP ${res.status}: ${body}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reason = message.toLowerCase().includes('aborted')
      ? `[${apiName}] timeout after ${FETCH_TIMEOUT_MS}ms`
      : `[${apiName}] fetch failed: ${message}`;
    return { ok: false, status: 0, error: reason };
  } finally {
    clearTimeout(timer);
  }
}

function getLockUntil(): number {
  return (globalThis as typeof globalThis & { __contentAutomationLockUntil?: number })
    .__contentAutomationLockUntil ?? 0;
}

function setLockUntil(ts: number): void {
  (globalThis as typeof globalThis & { __contentAutomationLockUntil?: number }).__contentAutomationLockUntil =
    ts;
}

async function fetchSnapshots(now: Date): Promise<{ rows: SnapshotRow[]; metrics: SnapshotMetrics }> {
  const day = now.toISOString().slice(0, 10);
  const rows: SnapshotRow[] = [];
  const metrics: SnapshotMetrics = {
    weatherSummary: null,
    exchangeSummary: null,
    errors: [],
  };

  const weatherRes = await fetchJsonWithTimeout<{ current?: { temperature_2m?: number; weather_code?: number } }>(
    'open-meteo',
    'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,weather_code&timezone=Asia%2FBangkok',
  );
  if (weatherRes.ok && weatherRes.data) {
    const weather = weatherRes.data;
    const temp = weather.current?.temperature_2m;
    metrics.weatherSummary =
      typeof temp === 'number' ? `Bangkok ${Math.round(temp * 10) / 10}C` : 'Bangkok temperature unavailable';
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
  } else if (weatherRes.error) {
    metrics.errors.push(weatherRes.error);
    console.error('[API /api/cron/content-automation] weather fetch failed:', weatherRes.error);
  }

  const fxRes = await fetchJsonWithTimeout<{ rates?: Record<string, number>; time_last_update_utc?: string }>(
    'open-er-api',
    'https://open.er-api.com/v6/latest/THB',
  );
  if (fxRes.ok && fxRes.data) {
    const fx = fxRes.data;
    const thbKrw = fx.rates?.KRW;
    metrics.exchangeSummary = typeof thbKrw === 'number' ? `THB/KRW ${thbKrw}` : 'THB/KRW unavailable';
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
  } else if (fxRes.error) {
    metrics.errors.push(fxRes.error);
    console.error('[API /api/cron/content-automation] exchange fetch failed:', fxRes.error);
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

  return { rows, metrics };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const pipelineId = 'cron/content-automation';
  const searchParams = new URL(req.url).searchParams;
  const force = searchParams.get('force') === '1';
  const key = readAndMaskForceKey(req);
  const secret = cronSecret();
  const authOk = isCronAuthorized(req.headers.get('authorization'));
  const keyOk = Boolean(secret) && key === secret;
  const manualAllowed = force && (authOk || keyOk || !secret);

  if (!authOk && !manualAllowed) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Unauthorized',
        hint: 'Use Authorization Bearer token or ?force=1&key=<CRON_SECRET>',
      },
      { status: 401 },
    );
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'MISSING_SERVICE_ROLE',
        hint: 'SUPABASE_SERVICE_ROLE_KEY 미설정 — raw_news·tips_upsert·뉴스 파이프라인이 DB에 쓸 수 없습니다.',
      },
      { status: 503 },
    );
  }

  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({
      pipelineId,
      event: 'content_automation',
      status: 'fallback',
      meta: { mode: 'pause_skip' },
    });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  const nowMs = Date.now();
  const lockUntil = getLockUntil();
  if (lockUntil > nowMs) {
    const retryAfterSec = Math.ceil((lockUntil - nowMs) / 1000);
    return NextResponse.json(
      {
        status: 'locked',
        error: 'content automation is already running or just finished',
        retry_after_seconds: retryAfterSec,
      },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }
  setLockUntil(nowMs + CONTENT_AUTOMATION_LOCK_MS);

  try {
    const now = new Date();
    const admin = createServiceRoleClient();
    const { rows: snapshots, metrics } = await fetchSnapshots(now);

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
      if (upsertError) {
        console.error('[API /api/cron/content-automation] raw_news upsert failed:', upsertError.message);
        throw new Error(`raw_news upsert failed: ${upsertError.message}`);
      }

      const { error: tipsError } = await admin.from('tips_articles').upsert(
        snapshots.map((s) => ({
          source_url: s.external_url,
          title: s.title,
          excerpt: `[AUTO][${s.source}] daily pipeline snapshot`,
          body_preview: s.raw_body.slice(0, 500),
          title_kr: s.title,
          content_kr: s.raw_body.slice(0, 900),
          title_th: s.title,
          content_th: s.raw_body.slice(0, 900),
          status: 'draft',
          published_at: null,
        })),
        { onConflict: 'source_url' },
      );
      if (tipsError) {
        console.error('[API /api/cron/content-automation] tips_articles upsert warning:', tipsError.message);
      }
    }

    const newsResult = await runNewsIngestPipeline({
      collect: { itemsPerFeed: 12 },
      process: { limit: 20 },
    });

    const collectOutput = (newsResult.collect.output ?? {}) as Record<string, unknown>;
    const persistInfo =
      (collectOutput.persist_raw_news as { upserted?: number; attempted?: number } | undefined) ?? {};
    const processOutput = (newsResult.process.output ?? {}) as Record<string, unknown>;
    const processedSucceeded =
      typeof processOutput.succeeded === 'number' ? processOutput.succeeded : null;
    const sanitizedRows = await runSanitizationPass(admin);

    await logCronEvent({
      pipelineId,
      event: 'content_automation',
      status: metrics.errors.length > 0 ? 'delayed' : 'success',
      meta: {
        snapshots_inserted: snapshots.length,
        external_api_errors: metrics.errors.length,
        sanitized_news: sanitizedRows,
      },
    });

    return NextResponse.json({
      status: 'success',
      trigger: force ? 'manual-force-fetch' : 'cron',
      snapshots_inserted: snapshots.length,
      inserted_news: persistInfo.upserted ?? 0,
      collected_news_attempted: persistInfo.attempted ?? 0,
      summarized_news: processedSucceeded,
      sanitized_news: sanitizedRows,
      updated_weather: metrics.weatherSummary ?? 'weather unavailable',
      updated_exchange: metrics.exchangeSummary ?? 'exchange unavailable',
      external_api_errors: metrics.errors,
      collect: newsResult.collect,
      process: newsResult.process,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/cron/content-automation] fatal error:', {
      message,
      hasCronSecret: Boolean(cronSecret()),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
      hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'content_automation',
      reason: message.toLowerCase().includes('timeout') ? 'content_api_timeout' : 'content_automation_failed',
      retryCount: 1,
    });
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
