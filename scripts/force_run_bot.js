/**
 * 로컬에서 고스트라이터 크론(`/api/cron/auto-content`)을 1회 즉시 호출합니다.
 *
 * 전제: Next dev/start 또는 Docker `thaija-web` 가 호스트의 3000 포트에 붙어 있음.
 *
 * 환경 (프로젝트 루트 `.env.local` / `.env` 자동 로드):
 *   CRON_SECRET 또는 BOT_CRON_SECRET — 서버에 설정돼 있으면 동일 값 필요
 *   BOT_CRON_BASE_URL — 기본 `http://localhost:3000`
 *   FORCE_RUN_BOT_TIMEOUT_MS — fetch 타임아웃(ms), 기본 600000(10분)
 */

const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

try {
  require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env.local') });
  require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env') });
} catch {
  /* dotenv 없으면 순수 환경 변수만 */
}

const base = (process.env.BOT_CRON_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const url = `${base}/api/cron/auto-content`;
const secret = (process.env.CRON_SECRET ?? process.env.BOT_CRON_SECRET ?? '').trim();
const timeoutMs = Math.max(60_000, Number(process.env.FORCE_RUN_BOT_TIMEOUT_MS) || 600_000);

async function main() {
  const headers = { Accept: 'application/json' };
  if (secret) headers.Authorization = `Bearer ${secret}`;

  console.log(`[force_run_bot] ${new Date().toISOString()} GET ${url}`);

  const res = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  const preview = text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
  console.log(`[force_run_bot] status ${res.status}`);
  console.log(preview);

  if (!res.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[force_run_bot] failed:', err.message || err);
  process.exitCode = 1;
});
