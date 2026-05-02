import 'server-only';

import { getSiteBaseUrl } from '@/lib/seo/site';

/** 쉐도우 QA가 순찰하는 공개 HTML 라우트 */
export const SHADOW_QA_UI_DEFAULT_PATHS = ['/tips', '/news', '/local/demo', '/korean-biz'] as const;

/**
 * Tailwind 본색 `bg-white` 만 금지(화이트 톤 깨짐).
 * `bg-white/10`, `bg-white-smoke` 등은 제외.
 */
export const FORBIDDEN_BG_WHITE_RE = /\bbg-white\b(?![\/\-])/g;

export function detectForbiddenBgWhite(html: string): boolean {
  FORBIDDEN_BG_WHITE_RE.lastIndex = 0;
  return FORBIDDEN_BG_WHITE_RE.test(html);
}

export type UiPatrolRouteResult = {
  path: string;
  ok: boolean;
  status?: number;
  ms: number;
  issues: string[];
};

/**
 * 프로덕션 점검 시 `SHADOW_QA_FETCH_ORIGIN` 으로 스테이징·프리뷰 URL 지정 가능.
 */
export function getShadowQaPatrolOrigin(): string {
  const raw = process.env.SHADOW_QA_FETCH_ORIGIN?.trim();
  if (raw) {
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      u.protocol = 'https:';
      return u.toString().replace(/\/+$/, '');
    } catch {
      /* fall through */
    }
  }
  return getSiteBaseUrl();
}

/** 단일 라우트당 페치 타임아웃(AbortSignal.timeout). 넉넉히 두어 순간 지연을 치명 오류로 보지 않음 */
export const SHADOW_QA_FETCH_TIMEOUT_MS = 10_000;

const PATROL_MAX_ATTEMPTS = 3;
const PATROL_RETRY_BASE_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOnePatrolRoute(url: string): Promise<{
  status?: number;
  issues: string[];
  ms: number;
}> {
  const t0 = performance.now();
  const issues: string[] = [];
  let status: number | undefined;

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'TaejaShadowQA/2.1 (+UI crawl)',
      },
      signal: AbortSignal.timeout(SHADOW_QA_FETCH_TIMEOUT_MS),
    });
    status = res.status;

    if (status === 404 || status === 500) {
      issues.push(`dead_page_http_${status}`);
    }

    const ct = (res.headers.get('content-type') ?? '').toLowerCase();
    if (issues.length === 0 && status >= 200 && status < 400 && ct.includes('text/html')) {
      const html = await res.text();
      if (detectForbiddenBgWhite(html)) {
        issues.push('critical_ui_forbidden_bg_white');
      }
    }

    return { status, issues, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    issues.push(`fetch_error:${msg.slice(0, 160)}`);
    return { status, issues, ms: Math.round(performance.now() - t0) };
  }
}

export async function runShadowQaUiPatrol(
  origin: string,
  paths: readonly string[] = SHADOW_QA_UI_DEFAULT_PATHS,
): Promise<{ ok: boolean; routes: UiPatrolRouteResult[] }> {
  const base = origin.replace(/\/+$/, '');
  const routes: UiPatrolRouteResult[] = [];

  for (const path of paths) {
    const pathNorm = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}${pathNorm}`;
    let last: UiPatrolRouteResult | null = null;

    for (let attempt = 0; attempt < PATROL_MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await sleep(PATROL_RETRY_BASE_MS * attempt);
      }
      const { status, issues, ms } = await fetchOnePatrolRoute(url);
      last = {
        path: pathNorm,
        ok: issues.length === 0,
        status,
        ms,
        issues,
      };
      if (last.ok) break;
    }

    routes.push(last!);
  }

  const ok = routes.every((r) => r.ok);
  return { ok, routes };
}
