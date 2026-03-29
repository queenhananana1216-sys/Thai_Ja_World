/**
 * 지식 수집(raw_knowledge) + 가공(processed_knowledge) 한 번 실행
 *
 * 사용: npm run knowledge:ingest
 *       .env.local 에 SUPABASE_SERVICE_ROLE_KEY 필요 (봇 로그·DB)
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { seedCuratedKnowledgeSources } from '../src/bots/lib/seedCuratedKnowledgeSources';
import { runKnowledgeCollectLoop } from '../src/bots/orchestrator/runKnowledgeCollectLoop';
import { runKnowledgeProcessLoop } from '../src/bots/orchestrator/runKnowledgeProcessLoop';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  if (process.env.KNOWLEDGE_AUTO_SEED !== '0') {
    const seed = await seedCuratedKnowledgeSources();
    console.log('[knowledge:ingest] seedCuratedKnowledgeSources', seed);
    if (seed.error) {
      console.error('[knowledge:ingest] 시드 오류 — 계속 진행합니다:', seed.error);
    }
  }

  console.log('[knowledge:ingest] collect…');
  // 공식 url_list 가 여러 개라 소스당 항목 상한을 넉넉히 (env 로 덮어쓰기 가능)
  const collect = await runKnowledgeCollectLoop({
    itemsPerSource: Math.min(
      20,
      Math.max(1, Number.parseInt(process.env.KNOWLEDGE_ITEMS_PER_SOURCE || '12', 10) || 12),
    ),
  });
  const co = collect.output as Record<string, unknown> | undefined;
  console.log('[knowledge:ingest] collect', {
    success: collect.success,
    skipped: collect.skipped,
    error: collect.error,
    items: Array.isArray(co?.items) ? (co.items as unknown[]).length : undefined,
    sources_failed: co?.sources_failed,
    persist: co?.persist_raw_knowledge,
  });

  console.log('[knowledge:ingest] process…');
  const proc = await runKnowledgeProcessLoop({});
  console.log('[knowledge:ingest] process', {
    success: proc.success,
    skipped: proc.skipped,
    error: proc.error,
    outputKeys: proc.output ? Object.keys(proc.output) : [],
  });

  if (collect.skipped || proc.skipped) {
    console.log('[knowledge:ingest] idempotency skip — 정상 종료');
    return;
  }
  if (collect.success === false) {
    console.error('[knowledge:ingest] 수집 실패');
    process.exit(1);
  }
  if (proc.success === false) {
    console.error('[knowledge:ingest] 가공 실패 (LLM 미설정 등일 수 있음)');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('[knowledge:ingest] 예외:', e);
  process.exit(1);
});
