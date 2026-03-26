/**
 * Cloudflare Turnstile 검증 (무료). 시크릿 없으면 개발용으로 통과.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  }

  const params = new URLSearchParams();
  params.set('secret', secret);
  params.set('response', token);
  const forwarded = req.headers.get('x-forwarded-for');
  const clientIpCandidate = forwarded?.split(',')[0]?.trim();
  // remoteip은 선택 값이므로, 이상한 문자열이 들어가면 전달하지 않는다.
  // (로컬/프록시 환경에서 x-forwarded-for 포맷이 달라질 수 있음)
  if (clientIpCandidate && /^[0-9a-fA-F:.]+$/.test(clientIpCandidate)) {
    params.set('remoteip', clientIpCandidate);
  }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
  if (!data.success) {
    return NextResponse.json(
      { error: 'turnstile_failed', codes: data['error-codes'] ?? [] },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
