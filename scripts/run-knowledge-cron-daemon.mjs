/**
 * PC를 계속 켜 두고 지식 수집·가공 크론을 주기적으로 호출합니다.
 *
 * 준비:
 *   1) Vercel(또는 로컬 next start)에 CRON_SECRET 이 있으면 같은 값을 아래 env에 둡니다.
 *   2) BOT_CRON_BASE_URL = 프로덕션 https://thaijaworld.com 또는 로컬 http://127.0.0.1:3000
 *
 * 실행 (프로젝트 루트):
 *   npm run bot:knowledge:daemon
 *   (Next 미기동 시 ECONNREFUSED → `npm run bot:knowledge:daemon:direct` 로 HTTP 없이 동일 파이프라인)
 *
 * 환경 변수:
 *   BOT_CRON_BASE_URL      — 필수에 가깝 (기본 http://127.0.0.1:3000)
 *   CRON_SECRET / BOT_CRON_SECRET — 서버에 설정돼 있으면 필수
 *   BOT_CRON_INTERVAL_MS   — 기본 45분 (2700000). 최소 60초.
 *   BOT_KNOWLEDGE_IDEMPOTENCY — hour(권장) | day | none
 *   BOT_KNOWLEDGE_ITEMS_PER_SOURCE, BOT_KNOWLEDGE_PROCESS_LIMIT — 선택 (쿼리로 전달)
 *   BOT_CRON_NEWS_INTERVAL_MS — 설정 시 /api/cron/news 도 같은 간격으로 호출 (최소 5분)
 *   BOT_CRON_FETCH_TIMEOUT_MS — 수집+가공 API 가 오래 걸릴 때 fetch 헤더/본문 타임아웃(ms). 기본 600000(10분)
 */

import { createRequire } from 'node:module';
import { Agent, fetch as undiciFetch } from 'undici';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

try {
  const require = createRequire(import.meta.url);
  require('dotenv').config({ path: join(root, '.env.local') });
  require('dotenv').config({ path: join(root, '.env') });
} catch {
  /* dotenv 없으면 순수 환경 변수만 사용 */
}

const BASE = (process.env.BOT_CRON_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const secret = (process.env.CRON_SECRET ?? process.env.BOT_CRON_SECRET ?? '').trim();

const intervalMs = Math.max(60_000, Number(process.env.BOT_CRON_INTERVAL_MS) || 45 * 60 * 1000);

const scopeRaw = (process.env.BOT_KNOWLEDGE_IDEMPOTENCY ?? 'hour').toLowerCase();
const scope = ['day', 'hour', 'none'].includes(scopeRaw) ? scopeRaw : 'hour';

const newsEvery = process.env.BOT_CRON_NEWS_INTERVAL_MS
  ? Math.max(300_000, Number(process.env.BOT_CRON_NEWS_INTERVAL_MS))
  : 0;

/** Node 기본 fetch 는 응답 헤더 대기 시간이 짧아 LLM 가공 포함 크론이 끊길 수 있음 */
const fetchTimeoutMs = Math.max(
  60_000,
  Number(process.env.BOT_CRON_FETCH_TIMEOUT_MS) || 600_000,
);
const httpAgent = new Agent({
  connectTimeout: 60_000,
  headersTimeout: fetchTimeoutMs,
  bodyTimeout: fetchTimeoutMs,
});

function knowledgeUrl() {
  const q = new URLSearchParams({ idempotencyScope: scope });
  const ips = process.env.BOT_KNOWLEDGE_ITEMS_PER_SOURCE?.trim();
  const lim = process.env.BOT_KNOWLEDGE_PROCESS_LIMIT?.trim();
  if (ips) q.set('itemsPerSource', ips);
  if (lim) q.set('limit', lim);
  return `${BASE}/api/cron/knowledge?${q}`;
}

function headers() {
  const h = { Accept: 'application/json' };
  if (secret) h.Authorization = `Bearer ${secret}`;
  return h;
}

async function ping(name, url) {
  const res = await undiciFetch(url, { headers: headers(), dispatcher: httpAgent });
  const text = await res.text();
  const preview = text.length > 800 ? `${text.slice(0, 800)}…` : text;
  console.log(`[${name}] ${new Date().toISOString()} ${res.status} ${preview}`);
}

function explainFetchError(label, e) {
  const cause = e?.cause;
  if (cause?.code === 'ECONNREFUSED' || cause?.errno === -4078) {
    console.error(
      `[${label}] 연결 거부(ECONNREFUSED): ${BASE} 에 Next.js 가 없습니다.\n` +
        '  → 다른 터미널에서 `npm run dev` 로 서버를 켜거나,\n' +
        '  → 지식만 Next 없이: `npm run bot:knowledge:daemon:direct`',
    );
    return;
  }
  console.error(`[${label}] error`, e);
}

async function tickKnowledge() {
  try {
    await ping('knowledge', knowledgeUrl());
  } catch (e) {
    explainFetchError('knowledge', e);
  }
}

async function tickNews() {
  try {
    await ping('news', `${BASE}/api/cron/news`);
  } catch (e) {
    explainFetchError('news', e);
  }
}

console.log(
  `[bot-daemon] base=${BASE} every=${Math.round(intervalMs / 1000)}s idempotencyScope=${scope} fetchTimeoutMs=${fetchTimeoutMs}` +
    (newsEvery ? ` + news every ${Math.round(newsEvery / 1000)}s` : ''),
);

void tickKnowledge();
setInterval(() => void tickKnowledge(), intervalMs);

if (newsEvery > 0) {
  void tickNews();
  setInterval(() => void tickNews(), newsEvery);
}
