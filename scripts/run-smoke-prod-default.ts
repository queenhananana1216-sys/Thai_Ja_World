/**
 * 프로덕션(www) 스모크 — /news 는 배포 전까지 생략.
 *   npx tsx scripts/run-smoke-prod-default.ts
 *   BASE_URL=... npx tsx scripts/run-smoke-prod-default.ts  (다른 스테이징 URL)
 */
async function run() {
  if (!process.env.BASE_URL?.trim()) {
    process.env.BASE_URL = 'https://www.thaijaworld.com';
  }
  if (!process.argv.includes('--skip-news')) {
    process.argv.push('--skip-news');
  }
  await import('./smoke-public-routes');
}

void run();

export {};
