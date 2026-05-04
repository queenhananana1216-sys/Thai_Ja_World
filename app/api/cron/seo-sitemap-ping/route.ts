/**
 * 매일 방콕 자정(UTC 17:00) — Google 에 sitemap.xml 갱신 ping.
 * @see vercel.json schedule `0 17 * * *`
 */
import { type NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { pingGoogleSitemap } from '@/lib/seo/googleSitemapPing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const ping = await pingGoogleSitemap();
  return NextResponse.json({
    ok: ping.ok,
    sitemap_ping: ping,
    ts: new Date().toISOString(),
  });
}
