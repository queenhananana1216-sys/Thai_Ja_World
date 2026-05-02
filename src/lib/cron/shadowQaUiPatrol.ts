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

export async function runShadowQaUiPatrol(
  origin: string,
  paths: readonly string[] = SHADOW_QA_UI_DEFAULT_PATHS,
): Promise<{ ok: boolean; routes: UiPatrolRouteResult[] }> {
  const base = origin.replace(/\/+$/, '');
  const routes: UiPatrolRouteResult[] = [];

  for (const path of paths) {
    const pathNorm = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}${pathNorm}`;
    const t0 = performance.now();
    const issues: string[] = [];
    let status: number | undefined;

    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'TaejaShadowQA/2.0 (+UI crawl)',
        },
        signal: AbortSignal.timeout(12_000),
      });
      status = res.status;
      const ms = Math.round(performance.now() - t0);

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

      routes.push({ path: pathNorm, ok: issues.length === 0, status, ms, issues });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      routes.push({
        path: pathNorm,
        ok: false,
        status,
        ms: Math.round(performance.now() - t0),
        issues: [`fetch_error:${msg.slice(0, 160)}`],
      });
    }
  }

  const ok = routes.every((r) => r.ok);
  return { ok, routes };
}
