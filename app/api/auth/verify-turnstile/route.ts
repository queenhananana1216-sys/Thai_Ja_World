/**
 * Cloudflare Turnstile 단독 검증용 (테스트·비-Supabase 폼 등).
 * Supabase Auth 에 `captchaToken` 을 넘기기 **전**에 이 API를 호출하면 안 된다.
 * 토큰은 1회용이라 여기서 소비되면 Supabase 검증이 실패한다.
 *
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
