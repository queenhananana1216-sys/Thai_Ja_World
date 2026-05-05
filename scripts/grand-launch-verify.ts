/**
 * 그랜드 오프닝 최종 감시 — 공개 라우트 404 금지 + 옴니 레이더 healthy + 비즈 감사 큐 요약.
 *
 *   BASE_URL=https://www.thaijaworld.com npx tsx scripts/grand-launch-verify.ts
 *   스테이징에서 일시적으로 degraded 허용: GRAND_LAUNCH_ALLOW_DEGRADED=1
 *   벌크 LLM 직후 옴니가 content_pipeline 만 degraded: GRAND_LAUNCH_ALLOW_CONTENT_PIPELINE_DEGRADED=1
 *
 * `npm run zero-raw:bulk-publish` 직후 같은 명령을 다시 실행해 라우트·옴니가 유지되는지 확인하세요.
 * LLM 가공 품질은 Vercel/호스트 로그에서 BILINGUAL_SYSTEM_PROMPT·KOREAN_ONLY_SYSTEM_PROMPT 적용 여부를 보거나,
 * 게시된 뉴스/꿀팁 본문에 「운영자의 대비책」절이 있는지 샘플 검토합니다.
 */
import { canonicalPublicBaseUrl } from './canonicalPublicBaseUrl';
import { PUBLIC_SMOKE_PATHS } from './publicSmokePaths';

type OmniJson = {
  status?: string;
  all_systems_go?: boolean;
  degradation_errors?: string[];
  checks?: {
    biz_audit_queue?: {
      warn?: boolean;
      pending_count?: number;
      oldest_pending_hours?: number | null;
      hint?: string | null;
      skipped?: boolean;
      error?: string;
    };
    motherbrain?: { radar_status?: string; all_green?: boolean };
    content_pipeline?: { ok?: boolean; skipped?: boolean; error?: string };
  };
};

function resolveBase(): string {
  const rawBase = process.env.BASE_URL ?? 'https://www.thaijaworld.com';
  return rawBase.includes('127.0.0.1') || rawBase.includes('localhost')
    ? rawBase.replace(/\/$/, '')
    : canonicalPublicBaseUrl(rawBase);
}

async function smokePaths(base: string): Promise<{ failures: string[]; pathCount: number }> {
  const failures: string[] = [];
  const skipNews = process.argv.includes('--skip-news') || process.env.SMOKE_SKIP_NEWS === '1';
  const paths = skipNews ? PUBLIC_SMOKE_PATHS.filter((p) => p !== '/news') : [...PUBLIC_SMOKE_PATHS];
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
  return { failures, pathCount: paths.length };
}

async function fetchOmni(base: string): Promise<{ http: number; j: OmniJson }> {
  const url = `${base}/api/health/omni-radar`;
  const res = await fetch(url, { cache: 'no-store' });
  const j = (await res.json().catch(() => ({}))) as OmniJson;
  return { http: res.status, j };
}

async function main() {
  const base = resolveBase();
  const allowDegraded = process.env.GRAND_LAUNCH_ALLOW_DEGRADED === '1';

  console.log(`[grand-launch] base=${base}`);
  const { failures: pathFailures, pathCount } = await smokePaths(base);
  if (pathFailures.length) {
    console.error('[grand-launch] 라우트 실패:\n', pathFailures.join('\n'));
    process.exit(1);
  }
  console.log(`[grand-launch] 라우트 OK (${pathCount} paths)`);

  const { http, j } = await fetchOmni(base);
  if (http === 503 || j.status === 'error') {
    console.error('[grand-launch] omni-radar error', JSON.stringify({ http, status: j.status, errors: j }, null, 2));
    process.exit(1);
  }

  const biz = j.checks?.biz_audit_queue;
  console.log('[grand-launch] biz_audit_queue (한인 생활망 재검증 제안 큐):', JSON.stringify(biz ?? {}, null, 2));

  if (biz?.skipped && biz?.error === 'service_role_unconfigured') {
    console.warn(
      '[grand-launch] 비즈 감사 큐는 서버에 SERVICE_ROLE 미설정으로 스킵되었습니다. 프로덕션에서는 설정되어 있어야 합니다.',
    );
  } else if (biz?.error) {
    console.warn('[grand-launch] biz_audit_queue 조회 경고:', biz.error);
  } else if (biz && typeof biz.pending_count === 'number') {
    console.log(
      `[grand-launch] 재검증 대기: ${biz.pending_count}건` +
        (biz.hint ? ` — ${biz.hint}` : '') +
        (biz.warn ? ' (warn 임계)' : ''),
    );
  }

  const deg = j.degradation_errors ?? [];
  const onlyContentPipeline =
    deg.length === 1 && typeof deg[0] === 'string' && deg[0].startsWith('content_pipeline:');
  const allowContentPipelineDegrade = process.env.GRAND_LAUNCH_ALLOW_CONTENT_PIPELINE_DEGRADED === '1';

  if (j.status === 'degraded' && !allowDegraded) {
    if (onlyContentPipeline && allowContentPipelineDegrade) {
      console.warn(
        '[grand-launch] omni degraded 이지만 content_pipeline 한 항목만 실패 — 벌크 LLM 직후·쿼터 구간일 수 있어 통과(GRAND_LAUNCH_ALLOW_CONTENT_PIPELINE_DEGRADED=1)',
        deg,
      );
    } else {
      console.error('[grand-launch] omni-radar degraded (올-그린 아님)', JSON.stringify(deg, null, 2));
      console.error(
        '[grand-launch] 힌트: 스테이징·일시적이면 GRAND_LAUNCH_ALLOW_DEGRADED=1 / 벌크 직후 콘텐츠 스트레스만이면 GRAND_LAUNCH_ALLOW_CONTENT_PIPELINE_DEGRADED=1',
      );
      process.exit(1);
    }
  }

  if (j.status === 'degraded' && allowDegraded) {
    console.warn('[grand-launch] degraded 허용 모드(GRAND_LAUNCH_ALLOW_DEGRADED=1) — 코어·라우트는 위에서 통과');
  }

  if (j.status === 'healthy') {
    console.log('[grand-launch] omni-radar status=healthy · all_systems_go=', j.all_systems_go ?? false);
  } else if (!(onlyContentPipeline && allowContentPipelineDegrade) && !(j.status === 'degraded' && allowDegraded)) {
    console.warn('[grand-launch] omni 요약: status=', j.status, 'http=', http);
  }

  console.log('[grand-launch] LLM 인격 소스: summarizeAndPersistNews.ts (BILINGUAL_SYSTEM_PROMPT / KOREAN_ONLY_SYSTEM_PROMPT), processAndPersistKnowledge.ts');
  console.log('[grand-launch] 한인망 UI: KoreanBizHubClient — integrityPending 시에만 「실제 연락처 확인 중」표시, 검증된 LINE/WhatsApp은 Link 버튼 활성화');
  console.log('[grand-launch] Stripe: STRIPE_SECRET_KEY + app/api/webhooks/stripe — 결제·구독·타이충전 웹훅 경로');
  console.log('[grand-launch] Zero-Raw 직후: `npm run verify:grand-launch:watch` 로 병행 감시 가능');
  console.log('[grand-launch] 완료 — 라우트·비즈 큐·옴니(정책) 검증 끝.');
}

void main();

export {};
