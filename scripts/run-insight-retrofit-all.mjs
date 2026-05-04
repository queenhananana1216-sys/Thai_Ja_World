/**
 * 프로덕션 인사이트 재가공 — processed_news + posts + processed_knowledge
 * 각 API의 eligible 이 모두 0이 될 때까지 라운드 반복.
 *
 * 사용 (PowerShell, 프로젝트 루트):
 *   Vercel에서 CRON_SECRET 을 교체했다면 로컬 스크립트도 동일 값이 필요합니다.
 *   `vercel env pull` 로 .env.local 동기화 후, 또는 수동으로:
 *   $env:CRON_SECRET = "<Vercel Production 과 동일>"   # 또는 BOT_CRON_SECRET
 *   node scripts/run-insight-retrofit-all.mjs
 *
 * 선택 환경 변수:
 *   INSIGHT_RETROFIT_BASE — 기본 https://thaijaworld.com
 *   INSIGHT_RETROFIT_LIMIT — 기본 25
 *   INSIGHT_RETROFIT_ONLY_MISSING — 기본 true
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });

const base = (process.env.INSIGHT_RETROFIT_BASE || 'https://thaijaworld.com').replace(/\/$/, '');
const secret = (process.env.CRON_SECRET || process.env.BOT_CRON_SECRET || '').trim();
const limit = Math.min(25, Math.max(1, parseInt(process.env.INSIGHT_RETROFIT_LIMIT || '25', 10) || 25));
const onlyMissing = process.env.INSIGHT_RETROFIT_ONLY_MISSING !== 'false';

if (!secret) {
  console.error('[insight-retrofit] CRON_SECRET 또는 BOT_CRON_SECRET 이 필요합니다.');
  process.exit(1);
}

const endpoints = [
  {
    name: 'processed_news',
    path: '/api/bot/insight-engine-retrofit',
    body: () =>
      JSON.stringify({
        limit,
        onlyMissing,
        skipTipsArticles: true,
      }),
  },
  {
    name: 'posts',
    path: '/api/bot/post-insight-engine',
    body: () =>
      JSON.stringify({
        limit,
        onlyMissing,
      }),
  },
  {
    name: 'processed_knowledge',
    path: '/api/bot/knowledge-insight-engine',
    body: () =>
      JSON.stringify({
        limit,
        onlyMissing,
      }),
  },
];

let round = 0;
const maxRounds = 400;
const totals = { processed_news: 0, posts: 0, processed_knowledge: 0 };

while (round < maxRounds) {
  round += 1;
  let anyEligible = false;
  for (const ep of endpoints) {
    const res = await fetch(`${base}${ep.path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: ep.body(),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j.status === 'error') {
      console.error(`[insight-retrofit] ${ep.name} 실패`, res.status, j.error || j);
      process.exit(1);
    }
    const ok = typeof j.ok === 'number' ? j.ok : 0;
    const eligible = typeof j.eligible === 'number' ? j.eligible : 0;
    const scanned = typeof j.scanned === 'number' ? j.scanned : 0;
    totals[ep.name] += ok;
    if (eligible > 0) anyEligible = true;
    console.log(
      `[insight-retrofit] round ${round} ${ep.name} http=${res.status} scanned=${scanned} eligible=${eligible} ok=${ok} failed=${Array.isArray(j.failed) ? j.failed.length : '?'}`,
    );
    await new Promise((r) => setTimeout(r, 1200));
  }
  if (!anyEligible) {
    console.log(
      `[insight-retrofit] 전체 완료 (라운드 ${round}). 누적 ok — news:${totals.processed_news} posts:${totals.posts} knowledge:${totals.processed_knowledge}`,
    );
    process.exit(0);
  }
}

console.error('[insight-retrofit] maxRounds 도달 — 남은 eligible 이 있을 수 있으니 다시 실행하세요.');
process.exit(2);
