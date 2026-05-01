import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isLocale, LOCALE_COOKIE, type Locale } from '@/i18n/types';

function localeFromCookie(request: NextRequest): Locale {
  const raw = request.cookies.get(LOCALE_COOKIE)?.value ?? '';
  return isLocale(raw) ? raw : 'ko';
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const langParam = url.searchParams.get('lang');
  if (langParam === 'ko' || langParam === 'th') {
    url.searchParams.delete('lang');
    const redirect = NextResponse.redirect(url);
    redirect.cookies.set(LOCALE_COOKIE, langParam, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return redirect;
  }

  const locale = localeFromCookie(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tj-locale', locale);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)',
  ],
};
