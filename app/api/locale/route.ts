/**
 * POST /api/locale  { "locale": "ko" | "th" } — 쿠키 저장 후 페이지 새로고침으로 반영
 */
import { NextResponse } from 'next/server';
import { LOCALE_COOKIE, isLocale, type Locale } from '@/i18n/types';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const loc =
    body !== null && typeof body === 'object' && 'locale' in body
      ? (body as { locale: unknown }).locale
      : undefined;

  if (typeof loc !== 'string' || !isLocale(loc)) {
    return NextResponse.json({ error: 'locale must be "ko" or "th"' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, locale: loc as Locale });
  res.cookies.set(LOCALE_COOKIE, loc, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  });
  return res;
}
