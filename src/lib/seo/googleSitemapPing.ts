import 'server-only';

import { getSiteBaseUrl } from '@/lib/seo/site';

/**
 * Google 에게 sitemap 갱신 알림 (Search Console 외 자동 ping).
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
 */
export async function pingGoogleSitemap(): Promise<{ ok: boolean; status?: number; error?: string }> {
  const base = getSiteBaseUrl();
  const sitemapUrl = `${base}/sitemap.xml`;
  const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(pingUrl, {
      method: 'GET',
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { Accept: 'text/plain,*/*' },
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(tid);
  }
}
