/**
 * 프로덕션 `insight-engine-retrofit` 반복 호출 — `eligible`이 0이 될 때까지.
 *
 * 사용 (PowerShell, 프로젝트 루트):
 *   $env:CRON_SECRET = "..."   # 또는 BOT_CRON_SECRET
 *   node scripts/run-insight-retrofit-all.mjs
 *
 * 선택 환경 변수:
 *   INSIGHT_RETROFIT_BASE — 기본 https://thaijaworld.com
 *   INSIGHT_RETROFIT_LIMIT — 기본 25
 *   INSIGHT_RETROFIT_ONLY_MISSING — 기본 true (false면 전면 재가공)
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

const body = () =>
  JSON.stringify({
    limit,
    onlyMissing,
    skipTipsArticles: true,
  });

let totalOk = 0;
let round = 0;
const maxRounds = 200;

while (round < maxRounds) {
  round += 1;
  const res = await fetch(`${base}/api/bot/insight-engine-retrofit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: body(),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.status === 'error') {
    console.error('[insight-retrofit] 실패', res.status, j.error || j);
    process.exit(1);
  }
  const ok = typeof j.ok === 'number' ? j.ok : 0;
  const eligible = typeof j.eligible === 'number' ? j.eligible : 0;
  const scanned = typeof j.scanned === 'number' ? j.scanned : 0;
  totalOk += ok;
  console.log(
    `[insight-retrofit] round ${round} http=${res.status} scanned=${scanned} eligible=${eligible} ok=${ok} failed=${Array.isArray(j.failed) ? j.failed.length : '?'}`,
  );
  if (eligible === 0) {
    console.log(`[insight-retrofit] 완료. 총 성공 갱신 ${totalOk}건 (라운드 ${round}).`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 1500));
}

console.error('[insight-retrofit] maxRounds 도달 — 수동으로 다시 실행하세요.');
process.exit(2);
