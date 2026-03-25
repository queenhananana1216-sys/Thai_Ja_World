/**
 * GET /api/cron/push-daily-digest — 구독자에게 최신 1건 기준 일일 웹 푸시
 */
import { type NextRequest, NextResponse } from 'next/server';
import { sendDailyWebPushDigest } from '@/lib/push/sendDailyWebPush';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function siteOrigin(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return new URL(req.url).origin;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendDailyWebPushDigest(siteOrigin(req));
    return NextResponse.json({ status: 'ok', ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ status: 'error', error: msg }, { status: 500 });
  }
}
