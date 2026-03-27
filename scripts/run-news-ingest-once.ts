/**
 * RSS 수집(raw_news) + 요약·발행(processed_news) 한 번 실행
 *
 * 사용: npm run news:ingest
 *       (프로젝트 루트, .env.local 에 SUPABASE_SERVICE_ROLE_KEY · NEWS_RSS_URLS 등 필요)
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { runNewsIngestPipeline } from '../src/bots/orchestrator/runNewsIngestPipeline';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('[news:ingest] 시작…');
  const { collect, process: processNews } = await runNewsIngestPipeline({});
  console.log('[news:ingest] collect', {
    success: collect.success,
    skipped: collect.skipped,
    error: collect.error,
    output: collect.output,
  });
  console.log('[news:ingest] process', {
    success: processNews.success,
    skipped: processNews.skipped,
    error: processNews.error,
    output: processNews.output,
  });
  if (collect.success === false || processNews.success === false) {
    console.error('[news:ingest] 일부 실패 — collect/process 로그 확인');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('[news:ingest] 실패:', e);
  process.exit(1);
});
