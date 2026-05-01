import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { LOCALE_COOKIE, isLocale, type Locale } from '@/i18n/types';

function resolveLocale(request: NextRequest): { locale: Locale; persistFromQuery: Locale | null } {
  const langParam = request.nextUrl.searchParams.get('lang');
  if (langParam && isLocale(langParam)) {
    return { locale: langParam, persistFromQuery: langParam };
  }
  const c = request.cookies.get(LOCALE_COOKIE)?.value;
  if (c && isLocale(c)) {
    return { locale: c, persistFromQuery: null };
  }
  return { locale: 'ko', persistFromQuery: null };
}

export async function middleware(request: NextRequest) {
  const { locale, persistFromQuery } = resolveLocale(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tj-locale', locale);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (persistFromQuery) {
    res.cookies.set(LOCALE_COOKIE, persistFromQuery, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    });
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)',
  ],
};
