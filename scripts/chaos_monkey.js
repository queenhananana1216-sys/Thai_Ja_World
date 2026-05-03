#!/usr/bin/env node
/**
 * Docker Chaos Monkey — HTTP 프로브로 API 경계를 자극하고, 웨이브 시작/종료를
 * POST /api/internal/chaos-http-wave 에 기록해 레이더 주황(자가 면역 훈련)을 켠다.
 *
 * 환경:
 *   CHAOS_BASE_URL          기본 http://thaija-web:3000
 *   CHAOS_HTTP_WAVE_SECRET  (또는 SANDBOX_PROPOSAL_INGEST_SECRET 동일 값)
 *   CHAOS_HTTP_DISABLED=1   웨이브·프로브 스킵
 *   CHAOS_RUN_ONCE=1        한 번 실행 후 종료 (수동/디버그)
 *
 * 스케줄: Asia/Bangkok 매일 03:00 (컨테이너 기준 다음 발생 시각까지 대기 후 24h 간격).
 */

/* eslint-disable no-console */

const BASE = (process.env.CHAOS_BASE_URL || 'http://thaija-web:3000').replace(/\/$/, '');
const SECRET =
  process.env.CHAOS_HTTP_WAVE_SECRET?.trim() ||
  process.env.SANDBOX_PROPOSAL_INGEST_SECRET?.trim() ||
  '';
const DISABLED = process.env.CHAOS_HTTP_DISABLED === '1' || process.env.CHAOS_HTTP_DISABLED === 'true';
const RUN_ONCE = process.env.CHAOS_RUN_ONCE === '1' || process.env.CHAOS_RUN_ONCE === 'true';

const BIG = 'Ｘ'.repeat(120_000);
const UNICODE_TERROR = '🔥\u200d💀\u202e\t\r\n' + '가'.repeat(8000) + '\uffff';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 다음 Asia/Bangkok wall-clock 03:00:00까지 밀리초 (최대 ~48h 스캔). */
function msUntilNextBangkok3am() {
  const now = Date.now();
  const max = 48 * 60 * 60 * 1000;
  for (let ms = 5000; ms < max; ms += 1000) {
    const t = new Date(now + ms);
    const wall = t.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
    const timePart = wall.split(' ')[1] || '';
    if (timePart.startsWith('03:00:00')) {
      return ms;
    }
  }
  return 24 * 60 * 60 * 1000;
}

async function postWave(phase, waveId, extra = {}) {
  const url = `${BASE}/api/internal/chaos-http-wave`;
  const body = JSON.stringify({
    phase,
    wave_id: waveId,
    ...extra,
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SECRET}`,
    },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`chaos_http_wave ${phase} failed: ${res.status} ${txt.slice(0, 200)}`);
  }
}

async function probe(name, fn) {
  const t0 = Date.now();
  try {
    const res = await fn();
    const ms = Date.now() - t0;
    console.log(`[chaos_monkey] probe ${name} → ${res.status} (${ms}ms)`);
    return { ok: true, status: res.status };
  } catch (e) {
    console.warn(`[chaos_monkey] probe ${name} ERROR:`, e instanceof Error ? e.message : e);
    return { ok: false };
  }
}

async function runProbes() {
  let ok = 0;
  let fail = 0;

  const bump = (r) => {
    if (r.ok) ok += 1;
    else fail += 1;
  };

  bump(
    await probe('health_get', () =>
      fetch(`${BASE}/api/health`, { method: 'GET', headers: { Accept: 'application/json' } }),
    ),
  );

  bump(
    await probe('posts_oversized_no_auth', () =>
      fetch(`${BASE}/api/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'free',
          title: BIG,
          content: 'x',
          image_urls: [],
        }),
      }),
    ),
  );

  bump(
    await probe('posts_missing_fields', () =>
      fetch(`${BASE}/api/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    ),
  );

  bump(
    await probe('posts_invalid_json', () =>
      fetch(`${BASE}/api/community/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{{{not-json',
      }),
    ),
  );

  bump(
    await probe('comments_unicode_no_auth', () =>
      fetch(`${BASE}/api/community/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: '00000000-0000-0000-0000-000000000001',
          content: UNICODE_TERROR,
        }),
      }),
    ),
  );

  bump(
    await probe('news_comments_missing_id', () =>
      fetch(`${BASE}/api/news/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer chaos-monkey-invalid' },
        body: JSON.stringify({ content: 'x' }),
      }),
    ),
  );

  bump(
    await probe('minihome_order_garbage', () =>
      fetch(`${BASE}/api/local/minihome-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          local_spot_id: 'not-a-uuid',
          party_size: 999,
          items: [{ menu_id: '🧪', qty: -1 }],
        }),
      }),
    ),
  );

  bump(
    await probe('site_search_long_query', () =>
      fetch(`${BASE}/api/public/site-search?q=${encodeURIComponent('α'.repeat(400))}&locale=ko`, {
        method: 'GET',
      }),
    ),
  );

  bump(
    await probe('fortune_daily_empty', () =>
      fetch(`${BASE}/api/fortune/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    ),
  );

  return { probes_ok: ok, probes_fail: fail };
}

async function runWave() {
  if (DISABLED) {
    console.log('[chaos_monkey] CHAOS_HTTP_DISABLED — 스킵');
    return;
  }
  if (!SECRET) {
    console.error('[chaos_monkey] CHAOS_HTTP_WAVE_SECRET (또는 SANDBOX_PROPOSAL_INGEST_SECRET) 없음');
    return;
  }

  const waveId = `wave-${Date.now()}`;
  try {
    await postWave('started', waveId);
  } catch (e) {
    console.error('[chaos_monkey] wave start failed:', e instanceof Error ? e.message : e);
    return;
  }

  let counts = { probes_ok: 0, probes_fail: 0 };
  try {
    counts = await runProbes();
  } finally {
    try {
      await postWave('completed', waveId, counts);
    } catch (e) {
      console.error('[chaos_monkey] wave completed log failed:', e instanceof Error ? e.message : e);
    }
  }

  console.log(
    `[chaos_monkey] wave ${waveId} done probes_ok=${counts.probes_ok} probes_fail=${counts.probes_fail}`,
  );
}

async function main() {
  if (RUN_ONCE) {
    await runWave();
    return;
  }
  console.log('[chaos_monkey] scheduled mode — Bangkok 03:00 daily, base=', BASE);
  for (;;) {
    const wait = msUntilNextBangkok3am();
    const fireAt = new Date(Date.now() + wait).toISOString();
    console.log(`[chaos_monkey] sleeping ${Math.round(wait / 1000)}s until ~Bangkok 03:00 (UTC ~ ${fireAt})`);
    await sleep(wait);
    await runWave();
    await sleep(60_000);
  }
}

main().catch((e) => {
  console.error('[chaos_monkey] fatal:', e);
  process.exit(1);
});
