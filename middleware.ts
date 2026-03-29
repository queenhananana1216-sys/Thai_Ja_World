import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { LOCALE_COOKIE, isLocale } from '@/i18n/types';

/** /news/[id]·/minihome/[slug](공개)·/shop/[slug] 는 비회원 열람. /minihome(내 편집)·커뮤니티·로컬·관리자는 로그인 필요 */
const PROTECTED_PREFIXES = ['/community', '/local', '/admin'] as const;

function pathRequiresAuth(pathname: string): boolean {
  if (pathname === '/minihome' || pathname === '/minihome/') return true;
  if (pathname.startsWith('/minihome/')) return false;

  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** layout에서 cookies() 대신 헤더만 읽게 해 일부 환경의 dev 무한 대기 완화 */
export async function middleware(request: NextRequest) {
  const raw = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = raw && isLocale(raw) ? raw : 'ko';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tj-locale', locale);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url?.trim() || !key?.trim()) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (pathRequiresAuth(pathname) && !user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set(
      'next',
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value);
    });
    return redirectResponse;
  }

  return response;
}

/** `_next/*` 전부 제외 — 청크·RSC·HMR 요청이 미들웨어를 타면 로딩이 멈춘 것처럼 보일 수 있음 */
export const config = {
  matcher: [
    '/((?!_next/|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)',
  ],
};
