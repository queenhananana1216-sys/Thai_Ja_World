import 'server-only';

import { getSiteBaseUrl } from '@/lib/seo/site';

const PROBE_MS = 5500;
/** 너무 짧으면 RSC 초기 번들만 받고 판별 실패 */
const MIN_SHELL_BYTES = 900;

/** 핵심 공개 허브 — 사용자가 「문이 안 열린다」고 느끼는 지점들 */
export const PUBLIC_SHELL_PROBE_PATHS = ['/', '/korean-biz', '/news', '/boards', '/tips'] as const;

function probeHtmlOrigin(): string | null {
  const v = process.env.VERCEL_URL?.trim();
  if (v) {
    const host = v.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    return `https://${host}`;
  }
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * 자기 호스트에 HTML 요청하여 **실제 셸**(바이너리 최소 크기+) 수신 여부를 검증.
 * - `VERCEL_URL` 또는 설정된 공개 도메인이 없으면 skipped.
 * - `OMNI_SKIP_PAGE_SHELL=1` 이면 skipped(로컬·특수 CI).
 */
export async function checkPublicHtmlShellRadar(): Promise<{
  ok: boolean;
  skipped?: boolean;
  origin?: string;
  routes?: Record<string, boolean | string>;
  error?: string;
}> {
  if (process.env.OMNI_SKIP_PAGE_SHELL === '1') {
    return { ok: true, skipped: true };
  }

  let origin = probeHtmlOrigin();
  if (!origin) {
    try {
      origin = new URL(getSiteBaseUrl()).origin;
    } catch {
      origin = null;
    }
  }
  if (!origin) {
    return { ok: true, skipped: true, error: 'no_probe_origin' };
  }

  const routes: Record<string, boolean | string> = {};

  await Promise.all(
    PUBLIC_SHELL_PROBE_PATHS.map(async (path) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), PROBE_MS);
      try {
        const url = `${origin}${path}`;
        const res = await fetch(url, {
          redirect: 'follow',
          cache: 'no-store',
          signal: ctrl.signal,
          headers: {
            Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
            'x-tj-locale': 'ko',
          },
        });
        if (!res.ok) {
          routes[path] = `http_${res.status}`;
          return;
        }
        const buf = await res.arrayBuffer();
        const bytes = buf.byteLength;
        if (bytes < MIN_SHELL_BYTES) {
          routes[path] = `too_small_${bytes}`;
          return;
        }
        const head = buf.byteLength > 12288 ? buf.slice(0, 12288) : buf;
        const slice = new TextDecoder('utf-8', { fatal: false }).decode(head);
        const low = slice.toLowerCase();
        const hints =
          (low.includes('<html') ||
            low.includes('<!doctype') ||
            low.includes('<body') ||
            low.includes('__next')) &&
          slice.length >= 380;

        routes[path] = hints ? true : 'no_document_shell_hint';
      } catch {
        routes[path] = 'fetch_error_or_timeout';
      } finally {
        clearTimeout(timer);
      }
    }),
  );

  const failed = PUBLIC_SHELL_PROBE_PATHS.filter((p) => routes[p] !== true);
  return {
    ok: failed.length === 0,
    origin,
    routes,
    error: failed.length ? `routes_failed:${failed.join(',')}` : undefined,
  };
}
