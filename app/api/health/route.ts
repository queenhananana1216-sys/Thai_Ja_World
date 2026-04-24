import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
// 헬스 응답은 캐시 금지 (매 호출마다 현재 상태 반영)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Check = { name: string; ok: boolean; detail?: string };

function maskVal(v: string | undefined): string {
  if (!v) return '';
  if (v.length <= 6) return '*'.repeat(v.length);
  return `${v.slice(0, 3)}...${v.slice(-3)}`;
}

async function checkSupabase(): Promise<Check> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return {
      name: 'supabase_env',
      ok: false,
      detail: `missing (NEXT_PUBLIC_SUPABASE_URL=${maskVal(url)} / ANON_KEY=${maskVal(key)})`,
    };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    // 루트 REST 는 200/401 이 정상 (DB 살아있는 신호)
    const alive = res.status === 200 || res.status === 401 || res.status === 404;
    return {
      name: 'supabase_rest',
      ok: alive,
      detail: `status=${res.status}`,
    };
  } catch (err) {
    return {
      name: 'supabase_rest',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

function checkServiceRoleEnv(): Check {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return {
    name: 'supabase_service_role_env',
    ok: Boolean(v),
    detail: v ? `set (${maskVal(v)})` : 'missing',
  };
}

function checkCriticalEnv(): Check[] {
  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL',
  ];
  return keys.map((k) => ({
    name: `env:${k}`,
    ok: Boolean(process.env[k]?.trim()),
  }));
}

export async function GET() {
  const [supabaseCheck] = await Promise.all([checkSupabase()]);

  const checks: Check[] = [
    ...checkCriticalEnv(),
    checkServiceRoleEnv(),
    supabaseCheck,
  ];
  const ok = checks.every((c) => c.ok);

  return NextResponse.json(
    {
      ok,
      ts: new Date().toISOString(),
      deploy: {
        sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
        env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
      },
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
