import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isLocale, LOCALE_COOKIE, type Locale } from '@/i18n/types';

function localeFromCookie(request: NextRequest): Locale {
  const raw = request.cookies.get(LOCALE_COOKIE)?.value ?? '';
  return isLocale(raw) ? raw : 'ko';
}

/** 본인 미니홈 설정·대시 (`/minihome/page`) — 공개 `/minihome/:slug`·`/minihome/shop` 과 구분 */
function minihomeManagementPath(pathname: string): boolean {
  const p = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (p === '/minihome') return true;
  if (p === '/minihome/me' || p.startsWith('/minihome/me/')) return true;
  return false;
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  let res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => {
            request.cookies.set(name, value);
          });
          res = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (minihomeManagementPath(url.pathname) && !user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/auth/login';
      loginUrl.searchParams.set('next', `${url.pathname}${url.search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)',
  ],
};
