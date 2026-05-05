/**
 * Zero-Raw 벌크 등 장시간 작업 중 옴니·핵심 라우트를 주기적으로 재확인합니다.
 * 다른 터미널에서 `npm run zero-raw:bulk-publish`를 돌리는 동안 이 스크립트를 켜 두세요.
 *
 *   BASE_URL=https://www.thaijaworld.com npx tsx scripts/grand-launch-watch.ts
 *   GRAND_LAUNCH_WATCH_INTERVAL_MS=20000 (기본 25000)
 */
import { canonicalPublicBaseUrl } from './canonicalPublicBaseUrl';
import { PUBLIC_SMOKE_PATHS } from './publicSmokePaths';

const CRITICAL = ['/', '/news', '/korean-biz', '/wallet/topup', '/community/boards'] as const;

function resolveBase(): string {
  const rawBase = process.env.BASE_URL ?? 'https://www.thaijaworld.com';
  return rawBase.includes('127.0.0.1') || rawBase.includes('localhost')
    ? rawBase.replace(/\/$/, '')
    : canonicalPublicBaseUrl(rawBase);
}

async function quickSmoke(base: string, paths: readonly string[]): Promise<string[]> {
  const failures: string[] = [];
  for (const p of paths) {
    const url = `${base}${p}`;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.status === 404) failures.push(`${url} → 404`);
      else if (!res.ok) failures.push(`${url} → ${res.status}`);
    } catch (e) {
      failures.push(`${url} → ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return failures;
}

async function omniLine(base: string): Promise<string> {
  const res = await fetch(`${base}/api/health/omni-radar`, { cache: 'no-store' });
  const j = (await res.json().catch(() => ({}))) as {
    status?: string;
    checks?: { biz_audit_queue?: { pending_count?: number; warn?: boolean; hint?: string | null } };
  };
  const biz = j.checks?.biz_audit_queue;
  const bizStr =
    biz == null
      ? 'biz=?'
      : `pending=${biz.pending_count ?? '?'} warn=${biz.warn === true}${biz.hint ? ` (${biz.hint})` : ''}`;
  return `http=${res.status} status=${j.status ?? '?'} ${bizStr}`;
}

async function main() {
  const base = resolveBase();
  const interval = Math.min(
    120_000,
    Math.max(5_000, parseInt(process.env.GRAND_LAUNCH_WATCH_INTERVAL_MS || '25000', 10) || 25_000),
  );
  const fullEvery = Math.max(1, parseInt(process.env.GRAND_LAUNCH_WATCH_FULL_EVERY || '4', 10) || 4);
  let tick = 0;
  console.log(`[grand-launch-watch] base=${base} interval_ms=${interval} (Ctrl+C 종료)`);
  console.log(`[grand-launch-watch] 전체 ${PUBLIC_SMOKE_PATHS.length}경로는 ${fullEvery}회마다, 매회 핵심 ${CRITICAL.length}경로 확인`);

  for (;;) {
    tick += 1;
    const iso = new Date().toISOString();
    const paths = tick % fullEvery === 0 ? [...PUBLIC_SMOKE_PATHS] : [...CRITICAL];
    const fails = await quickSmoke(base, paths);
    const line = await omniLine(base);
    if (fails.length) {
      console.error(`[${iso}] SMOKE FAIL:\n`, fails.join('\n'));
    } else {
      console.log(`[${iso}] smoke_ok (${paths.length} paths) | ${line}`);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

void main();

export {};
