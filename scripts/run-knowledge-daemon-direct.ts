/**
 * Next.js 없이 지식 수집·가공을 주기 실행 (로컬 PC 상시 수집용)
 *
 *   npm run bot:knowledge:daemon:direct
 *
 * idempotency 키는 /api/cron/knowledge 와 동일(cron-knowledge-*)이라 HTTP 크론과 중복 실행을 막습니다.
 *
 * 환경 변수: BOT_CRON_INTERVAL_MS, BOT_KNOWLEDGE_IDEMPOTENCY, KNOWLEDGE_AUTO_SEED,
 *           BOT_KNOWLEDGE_ITEMS_PER_SOURCE, BOT_KNOWLEDGE_PROCESS_LIMIT (.env.local)
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { seedCuratedKnowledgeSources } from '../src/bots/lib/seedCuratedKnowledgeSources';
import { runKnowledgeCollectLoop } from '../src/bots/orchestrator/runKnowledgeCollectLoop';
import { runKnowledgeProcessLoop } from '../src/bots/orchestrator/runKnowledgeProcessLoop';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const intervalMs = Math.max(60_000, Number(process.env.BOT_CRON_INTERVAL_MS) || 45 * 60 * 1000);
const scopeRaw = (process.env.BOT_KNOWLEDGE_IDEMPOTENCY ?? 'hour').toLowerCase();
const scope = ['day', 'hour', 'none'].includes(scopeRaw) ? scopeRaw : 'hour';

function buildKeys(): { collectKey?: string; processKey?: string } {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hourUtc = now.toISOString().slice(0, 13);
  if (scope === 'day') {
    return {
      collectKey: `cron-knowledge-collect-${day}`,
      processKey: `cron-knowledge-process-${day}`,
    };
  }
  if (scope === 'hour') {
    return {
      collectKey: `cron-knowledge-collect-${hourUtc}`,
      processKey: `cron-knowledge-process-${hourUtc}`,
    };
  }
  return {};
}

function collectOptions(): { itemsPerSource?: number } {
  const raw = process.env.BOT_KNOWLEDGE_ITEMS_PER_SOURCE?.trim();
  if (!raw) return {};
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1 || n > 20) return {};
  return { itemsPerSource: n };
}

function processOptions(): { limit?: number } {
  const raw = process.env.BOT_KNOWLEDGE_PROCESS_LIMIT?.trim();
  if (!raw) return {};
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1 || n > 30) return {};
  return { limit: n };
}

async function tick() {
  const ts = new Date().toISOString();
  try {
    if (process.env.KNOWLEDGE_AUTO_SEED !== '0') {
      const seed = await seedCuratedKnowledgeSources();
      if (seed.error) console.warn(`[knowledge-direct] ${ts} seed: ${seed.error}`);
    }
    const { collectKey, processKey } = buildKeys();
    const collect = await runKnowledgeCollectLoop({
      ...collectOptions(),
      ...(collectKey ? { idempotencyKey: collectKey } : {}),
    });
    console.log(`[knowledge-direct] ${ts} collect`, {
      skipped: collect.skipped,
      success: collect.success,
      error: collect.error,
    });
    const proc = await runKnowledgeProcessLoop({
      ...processOptions(),
      ...(processKey ? { idempotencyKey: processKey } : {}),
    });
    console.log(`[knowledge-direct] ${ts} process`, {
      skipped: proc.skipped,
      success: proc.success,
      error: proc.error,
    });
  } catch (e) {
    console.error(`[knowledge-direct] ${ts}`, e);
  }
}

console.log(
  `[knowledge-direct] interval=${Math.round(intervalMs / 1000)}s idempotency=${scope} (Next 불필요)`,
);

void tick();
setInterval(() => void tick(), intervalMs);
