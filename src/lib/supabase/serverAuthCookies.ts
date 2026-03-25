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
