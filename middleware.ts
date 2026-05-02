import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
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
 * 모바일·LTE 등에서 매 요청 Supabase 세션 검증(`getUser`) 왕복이 지연·타임아웃을 키울 수 있어,
 * 인증 게이트가 미들웨어에 없는 공개 구간은 세션 호출 없이 즉시 통과한다.
 * (User-Agent·IP 기반 봇 차단은 이 파일에 없음 — Cloudflare/Vercel 대시보드 규칙과 별개.)
 */
function isPublicFastPassPath(pathname: string): boolean {
  const p = normalizePathname(pathname);
  if (p === '/') return true;
  if (p === '/community' || p.startsWith('/community/')) return true;
  if (p === '/local' || p.startsWith('/local/')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  /** 레거시·문서상 `/login` → 실제 로그인 라우트 */
  if (url.pathname === '/login' || url.pathname === '/login/') {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    return NextResponse.redirect(loginUrl);
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

  const nextWithLocale = () =>
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  if (isPublicFastPassPath(url.pathname)) {
    return nextWithLocale();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  let res = nextWithLocale();

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
