/**
 * 프로덕션(또는 스테이징) 단계별 검증.
 *
 *   npx tsx scripts/verify-production-pipeline.ts
 *   npx tsx scripts/verify-production-pipeline.ts --strict
 *
 * 환경 변수:
 *   BASE_URL / VERIFY_BASE_URL — 기본 https://www.thaijaworld.com (apex 는 www 로 정규화)
 *   VERIFY_STRICT_NEWS=1 또는 --strict → /news 가 404면 실패
 */
import { canonicalPublicBaseUrl } from './canonicalPublicBaseUrl';

const argvStrict = process.argv.includes('--strict');
const strictNews = argvStrict || process.env.VERIFY_STRICT_NEWS === '1';
const rawBaseInput = (
  process.env.BASE_URL ??
  process.env.VERIFY_BASE_URL ??
  'https://www.thaijaworld.com'
)
  .trim()
  .replace(/\/$/, '');
const base = canonicalPublicBaseUrl(rawBaseInput);

const PUBLIC_PATHS = ['/', '/tips', '/local', '/contact', '/terms', '/privacy'] as const;
const NEWS_PATH = '/news';

type Phase = { name: string; ok: boolean; lines: string[] };

async function phaseCron(): Promise<Phase> {
  const lines: string[] = [];
  const url = `${base}/api/cron/news`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (res.status === 401) {
      lines.push(`GET ${url} → 401 (비인증 차단 — CRON_SECRET 설정된 것으로 추정, 정상)`);
      return { name: 'Cron 보호 (/api/cron/news)', ok: true, lines };
    }
    if (res.status === 200) {
      lines.push(
        `GET ${url} → 200 (경고: 비밀 없이도 호출 가능할 수 있음. Vercel에 CRON_SECRET 설정 권장)`,
      );
      return { name: 'Cron 보호 (/api/cron/news)', ok: false, lines };
    }
    lines.push(`GET ${url} → ${res.status}`);
    return { name: 'Cron 보호 (/api/cron/news)', ok: res.status !== 500, lines };
  } catch (e) {
    lines.push(`요청 실패: ${e instanceof Error ? e.message : String(e)}`);
    return { name: 'Cron 보호 (/api/cron/news)', ok: false, lines };
  }
}

async function phasePublic(): Promise<Phase> {
  const lines: string[] = [];
  let ok = true;
  for (const p of PUBLIC_PATHS) {
    const url = `${base}${p}`;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.status === 404) {
        lines.push(`FAIL ${url} → 404`);
        ok = false;
      } else if (!res.ok) {
        lines.push(`WARN ${url} → ${res.status}`);
        if (res.status >= 500) ok = false;
      } else {
        lines.push(`OK   ${url} → ${res.status}`);
      }
    } catch (e) {
      lines.push(`FAIL ${url} → ${e instanceof Error ? e.message : String(e)}`);
      ok = false;
    }
  }

  const newsUrl = `${base}${NEWS_PATH}`;
  try {
    const res = await fetch(newsUrl, { redirect: 'follow' });
    if (res.status === 404) {
      lines.push(
        `NEWS ${newsUrl} → 404 (레포에 app/news/page.tsx 있음 — 최신 빌드 배포 후 200 기대)${
          strictNews ? ' [VERIFY_STRICT_NEWS=1 이라 실패 처리]' : ' [경고만, 기본은 통과]'
        }`,
      );
      if (strictNews) ok = false;
    } else if (!res.ok) {
      lines.push(`WARN ${newsUrl} → ${res.status}`);
      if (res.status >= 500) ok = false;
    } else {
      lines.push(`OK   ${newsUrl} → ${res.status}`);
    }
  } catch (e) {
    lines.push(`FAIL ${newsUrl} → ${e instanceof Error ? e.message : String(e)}`);
    ok = false;
  }

  return { name: '공개 라우트', ok, lines };
}

async function phaseKnowledgeNote(): Promise<Phase> {
  const lines = [
    '지식 RSS 수정(091)은 원격 DB에 이미 스크립트로 반영했거나, supabase db push 로 마이그레이션 적용 필요.',
    '로컬 재검증: npm run knowledge:ingest',
  ];
  return { name: 'DB·지식 파이프라인 (수동)', ok: true, lines };
}

async function main() {
  if (base !== rawBaseInput) {
    console.log(`[verify:prod] 호스트 정규화: ${rawBaseInput} → ${base}`);
  }
  console.log(
    `[verify:prod] BASE_URL=${base}${strictNews ? ' [strict: /news 필수 200]' : ''}\n`,
  );
  const phases = [await phaseCron(), await phasePublic(), await phaseKnowledgeNote()];
  let exitCode = 0;
  for (const ph of phases) {
    const mark = ph.ok ? '✓' : '✗';
    console.log(`${mark} ${ph.name}`);
    for (const line of ph.lines) console.log(`   ${line}`);
    console.log('');
    if (!ph.ok) exitCode = 1;
  }
  if (exitCode === 0) {
    console.log(
      strictNews
        ? '[verify:prod] 요약: strict — Cron·공개 경로·/news 모두 통과.'
        : '[verify:prod] 요약: Cron·필수 공개 경로 통과. /news 는 404여도 기본 모드에선 경고만.',
    );
  } else {
    console.error('[verify:prod] 일부 단계 실패 — 위 로그 확인');
  }
  process.exit(exitCode);
}

void main();

export {};
