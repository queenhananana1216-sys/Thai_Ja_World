/**
 * 배포 직후·10분 주기 홈 스모크. 사용자가 관여 안 해도 500 을 먼저 감지한다.
 *
 * 호출:
 *  - Vercel Cron: `vercel.json` 에 등록, Authorization: Bearer <CRON_SECRET>.
 *  - GitHub Actions(post-deploy): `curl -H "Authorization: Bearer $CRON_SECRET" ...`.
 *  - 수동: `curl https://www.thaijaworld.com/api/cron/post-deploy-smoke`.
 *
 * 동작:
 *  1. `${siteUrl}/api/health` 호출 → env/Supabase 상태 수집.
 *  2. 공개 라우트 5종 (/, /tips, /local, /contact, /terms) 에 GET 하여 HTTP 2xx/3xx 확인.
 *  3. 모두 OK 면 200, 실패가 있으면 500 + Slack 웹훅 알림(SLACK_WEBHOOK_URL 있는 경우).
 */
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_PATHS = ['/', '/tips', '/local', '/contact', '/terms'] as const;

function canonicalBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return 'https://www.thaijaworld.com';
  if (/^https?:\/\/thaijaworld\.com$/i.test(trimmed)) {
    return trimmed.replace(/thaijaworld\.com/i, 'www.thaijaworld.com');
  }
  return trimmed;
}

type Result = { target: string; ok: boolean; status: number | null; error?: string };

async function probeOne(url: string): Promise<Result> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal });
    clearTimeout(t);
    return {
      target: url,
      ok: res.ok,
      status: res.status,
    };
  } catch (err) {
    return {
      target: url,
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function notifySlack(summary: string, details: string) {
  const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhook?.startsWith('https://hooks.slack.com/')) return;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `*[TaejaWorld post-deploy smoke]* ${summary}\n\`\`\`${details}\`\`\``,
      }),
    });
  } catch (err) {
    console.warn('[post-deploy-smoke] slack notify failed:', err);
  }
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const base = canonicalBase(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thaijaworld.com',
  );

  // 자기 자신 /api/health 호출
  const healthUrl = `${base}/api/health`;
  const publicResults = await Promise.all([
    probeOne(healthUrl),
    ...PUBLIC_PATHS.map((p) => probeOne(`${base}${p}`)),
  ]);

  const failed = publicResults.filter((r) => !r.ok);
  const allOk = failed.length === 0;

  if (!allOk) {
    const summary = `${failed.length}/${publicResults.length} checks failed on ${base}`;
    const details = publicResults
      .map((r) => `${r.ok ? 'OK ' : 'FAIL'} ${r.status ?? '-'} ${r.target}${r.error ? ` — ${r.error}` : ''}`)
      .join('\n');
    await notifySlack(summary, details);
  }

  return NextResponse.json(
    {
      ok: allOk,
      ts: new Date().toISOString(),
      base,
      deploy: {
        sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        env: process.env.VERCEL_ENV ?? null,
      },
      results: publicResults,
    },
    { status: allOk ? 200 : 503 },
  );
}
