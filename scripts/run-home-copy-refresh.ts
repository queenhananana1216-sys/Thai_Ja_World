/**
 * 홈 UI 참여유도 카피(룰 기반) 자동 갱신
 *
 * 사용:
 *   npm run home-copy:refresh
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { runEngagementCopyPipeline } from '../src/lib/siteCopy/runEngagementCopyPipeline';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('[home-copy:refresh] 시작…');
  const result = await runEngagementCopyPipeline();
  console.log('[home-copy:refresh] snapshot', result.snapshot);
  console.log('[home-copy:refresh] updated entries:', result.updated);
}

main().catch((e) => {
  console.error('[home-copy:refresh] 실패:', e);
  process.exit(1);
});
