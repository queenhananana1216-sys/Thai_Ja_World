/**
 * 배포 후 공개 라우트 스모크: `BASE_URL` 기준 GET 시 404가 아닌지 확인합니다.
 *
 *   BASE_URL=https://www.thaijaworld.com npx tsx scripts/smoke-public-routes.ts
 *   BASE_URL=http://127.0.0.1:3000 npx tsx scripts/smoke-public-routes.ts
 *   /news 배포 전: npx tsx scripts/smoke-public-routes.ts --skip-news
 */
import { canonicalPublicBaseUrl } from './canonicalPublicBaseUrl';

const rawBase = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const base =
  rawBase.includes('127.0.0.1') || rawBase.includes('localhost')
    ? rawBase.replace(/\/$/, '')
    : canonicalPublicBaseUrl(rawBase);

const ALL_PATHS = [
  '/',
  '/news',
  '/tips',
  '/local',
  '/contact',
  '/terms',
  '/privacy',
] as const;

const skipNews = process.argv.includes('--skip-news') || process.env.SMOKE_SKIP_NEWS === '1';
const paths = skipNews ? ALL_PATHS.filter((p) => p !== '/news') : [...ALL_PATHS];

/** API는 페이지와 분리(502 시 업스트림·쿼터 — 경고만) */
const API_PATHS = ['/api/weather', '/api/stats'] as const;

const EXTRA_PAGE_PATHS = ['/community/boards'] as const;

async function main() {
  if (skipNews) {
    console.log('[smoke-public-routes] /news 검사 생략 (--skip-news 또는 SMOKE_SKIP_NEWS=1)');
  }
  const failures: string[] = [];
  const allPaths = [...paths, ...EXTRA_PAGE_PATHS];
  for (const p of allPaths) {
    const url = `${base}${p}`;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.status === 404) failures.push(`${url} → 404`);
      else if (!res.ok) failures.push(`${url} → ${res.status}`);
    } catch (e) {
      failures.push(`${url} → ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const apiWarnings: string[] = [];
  for (const p of API_PATHS) {
    const url = `${base}${p}`;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.status === 404) apiWarnings.push(`${url} → 404`);
      else if (res.status === 502) apiWarnings.push(`${url} → 502 (upstream, non-fatal)`);
      else if (!res.ok) apiWarnings.push(`${url} → ${res.status}`);
    } catch (e) {
      apiWarnings.push(`${url} → ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (failures.length) {
    console.error('[smoke-public-routes] 실패:\n', failures.join('\n'));
    process.exit(1);
  }
  for (const w of apiWarnings) {
    console.warn('[smoke-public-routes] API', w);
  }
  console.log(
    `[smoke-public-routes] OK (${allPaths.length} page(s), ${API_PATHS.length} API check(s)) @ ${base}`,
  );
}

void main();

export {};
