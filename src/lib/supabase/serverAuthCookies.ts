/**
 * 서버 컴포넌트·레이아웃에서 세션이 필요할 때만 사용 (쿠키 기반).
 * 일반 공개 읽기는 server.ts 의 anon 클라이언트를 쓰세요.
 */
import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error('[serverAuthCookies] Supabase URL/anon key missing');
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Server Component에서는 set이 막힐 수 있음 — 읽기만 할 때 무시 */
        }
      },
    },
  });
}

/**
 * 루트 레이아웃 등에서 env/쿠키 이슈 시에도 전체가 죽지 않도록 쓰는 변형.
 * 실패하면 null 을 반환 — 호출부에서 "세션 없음" 으로 처리.
 *
 * 반드시 Server Component 에서만 사용 ( `cookies()` 가 필요 ).
 */
export async function tryCreateServerSupabaseAuthClient() {
  try {
    return await createServerSupabaseAuthClient();
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[serverAuthCookies] tryCreate... 실패 — null 반환', err);
    }
    return null;
  }
}
