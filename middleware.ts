import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { LOCALE_COOKIE, isLocale } from '@/i18n/types';
import { withTimeoutMs } from '@/lib/server/withTimeout';

const MIDDLEWARE_AUTH_DEADLINE_MS = 3000;

/** /news/[id]·/minihome/[slug](공개)·/shop/[slug] 는 비회원 열람. /minihome(내 편집)·/my-local-shop·커뮤니티·로컬·관리자는 로그인 필요 */
const PROTECTED_PREFIXES = ['/community', '/local', '/admin'] as const;

function pathRequiresAuth(pathname: string): boolean {
  /** 비회원 꿀팁 허브 — 본문은 로그인 후 광장 */
  if (pathname === '/tips' || pathname === '/tips/' || pathname.startsWith('/tips/')) return false;

  if (pathname === '/minihome' || pathname === '/minihome/') return true;
  if (pathname === '/minihome/shop' || pathname.startsWith('/minihome/shop/')) return true;
  if (pathname.startsWith('/minihome/')) return false;

  if (pathname === '/my-local-shop' || pathname.startsWith('/my-local-shop/')) return true;

  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** layout에서 cookies() 대신 헤더만 읽게 해 일부 환경의 dev 무한 대기 완화 */
export async function middleware(request: NextRequest) {
  const langQ = request.nextUrl.searchParams.get('lang');
  if ((langQ === 'ko' || langQ === 'th') && request.nextUrl.searchParams.has('lang')) {
    const u = request.nextUrl.clone();
    u.searchParams.delete('lang');
    const red = NextResponse.redirect(u);
    red.cookies.set(LOCALE_COOKIE, langQ, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return red;
  }

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

  let user: { id: string } | null = null;
  try {
    const got = await withTimeoutMs(supabase.auth.getUser(), MIDDLEWARE_AUTH_DEADLINE_MS, 'middleware_auth');
    user = got.data.user;
  } catch {
    /** Supabase Auth 지연 시 요청을 막지 않음(홈·정적 응답 우선). 보호 경로는 일시 비로그인 허용될 수 있음 */
    return response;
  }

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
