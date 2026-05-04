import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { isLocale, LOCALE_COOKIE, type Locale } from '@/i18n/types';

function localeFromCookie(request: NextRequest): Locale {
  const raw = request.cookies.get(LOCALE_COOKIE)?.value ?? '';
  return isLocale(raw) ? raw : 'ko';
}

function normalizePathname(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/** 본인 미니홈 설정·대시 (`/minihome/page`) — 공개 `/minihome/:slug`·`/minihome/shop` 과 구분 */
function minihomeManagementPath(pathname: string): boolean {
  const p = normalizePathname(pathname);
  if (p === '/minihome') return true;
  if (p === '/minihome/me' || p.startsWith('/minihome/me/')) return true;
  return false;
}

/**
 * Supabase SSR 세션 갱신: 모든 매칭 페이지에서 최우선 실행해 refresh 토큰·쿠키가 응답에 실리도록 한다.
 * (공개 경로라도 건너뛰면 커뮤니티 글쓰기 등에서 세션이 박살 난다.)
 */
async function updateSession(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<{ response: NextResponse; user: User | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response, user: null };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

function applyCookiesToRedirect(from: NextResponse, redirect: NextResponse): NextResponse {
  for (const c of from.cookies.getAll()) {
    redirect.cookies.set(c.name, c.value, {
      path: c.path,
      maxAge: c.maxAge,
      domain: c.domain,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      partitioned: c.partitioned,
      priority: c.priority,
    });
  }
  return redirect;
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  /** 레거시·문서상 `/login` → 실제 로그인 라우트 */
  if (url.pathname === '/login' || url.pathname === '/login/') {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    return NextResponse.redirect(loginUrl);
  }

  /** 구 문서·푸시 등 `/portal/weather` → 실제 `app/weather/page.tsx` */
  if (url.pathname === '/portal/weather' || url.pathname === '/portal/weather/') {
    const w = request.nextUrl.clone();
    w.pathname = '/weather';
    return NextResponse.redirect(w);
  }

  const langParam = url.searchParams.get('lang');
  if (langParam === 'ko' || langParam === 'th' || langParam === 'en' || langParam === 'zh') {
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

  const { response: res, user } = await updateSession(request, requestHeaders);

  if (minihomeManagementPath(url.pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.searchParams.set('next', `${url.pathname}${url.search}`);
    return applyCookiesToRedirect(res, NextResponse.redirect(loginUrl));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)',
  ],
};
