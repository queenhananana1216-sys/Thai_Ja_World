import { NextResponse } from 'next/server';
import { normalizePhoneToE164 } from '@/lib/auth/normalizePhoneE164';
import { getPhoneAuthProvider } from '@/lib/auth/phone-provider';
import { isSupportedPhoneMarket, mapPhoneProviderError } from '@/lib/auth/otpPolicy';

export const runtime = 'nodejs';

type VerifyOtpBody = {
  phone?: string;
  code?: string;
};

export async function POST(request: Request) {
  let body: VerifyOtpBody;
  try {
    body = (await request.json()) as VerifyOtpBody;
  } catch {
    return NextResponse.json({ code: 'invalid_code', message: 'invalid_json' }, { status: 400 });
  }

  const normalized = normalizePhoneToE164(body.phone ?? '');
  if (!normalized.ok || !isSupportedPhoneMarket(normalized.e164)) {
    return NextResponse.json({ code: 'invalid_phone', message: 'invalid_phone' }, { status: 400 });
  }

  const rawCode = typeof body.code === 'string' ? body.code : '';
  if (rawCode.replace(/\D/g, '').length < 6) {
    return NextResponse.json({ code: 'invalid_code', message: 'invalid_code' }, { status: 400 });
  }

  try {
    const provider = getPhoneAuthProvider();
    const verified = await provider.verifyOtp(normalized.e164, rawCode);
    if (!verified.ok) {
      const mapped = mapPhoneProviderError(verified.code, verified.message);
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json({ ok: true, provider: verified.provider, phone: normalized.e164 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'verify_failed';
    return NextResponse.json({ code: 'otp_verify_failed', message }, { status: 500 });
  }
}
