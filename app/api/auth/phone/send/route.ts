import { NextResponse } from 'next/server';
import { normalizePhoneToE164 } from '@/lib/auth/normalizePhoneE164';
import { getPhoneAuthProvider } from '@/lib/auth/phone-provider';
import {
  assertOtpSendPolicy,
  hashIp,
  isSupportedPhoneMarket,
  logOtpSendAttempt,
  mapPhoneProviderError,
  readClientIp,
} from '@/lib/auth/otpPolicy';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type SendOtpBody = {
  phone?: string;
};

export async function POST(request: Request) {
  let body: SendOtpBody;
  try {
    body = (await request.json()) as SendOtpBody;
  } catch {
    return NextResponse.json({ code: 'invalid_phone', message: 'invalid_json' }, { status: 400 });
  }

  const normalized = normalizePhoneToE164(body.phone ?? '');
  if (!normalized.ok) {
    return NextResponse.json({ code: 'invalid_phone', message: 'invalid_phone' }, { status: 400 });
  }
  if (!isSupportedPhoneMarket(normalized.e164)) {
    return NextResponse.json(
      { code: 'invalid_phone', message: 'supported_markets_are_kr_th' },
      { status: 400 },
    );
  }

  try {
    const admin = createServiceRoleClient();
    const ipHash = hashIp(readClientIp(request));
    const policy = await assertOtpSendPolicy(admin, normalized.e164, ipHash);
    if (!policy.ok) {
      return NextResponse.json(
        { code: policy.code, message: policy.code, retryAfterSec: policy.retryAfterSec },
        { status: 429 },
      );
    }

    const provider = getPhoneAuthProvider();
    const sent = await provider.sendOtp(normalized.e164);
    if (!sent.ok) {
      const mapped = mapPhoneProviderError(sent.code, sent.message);
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }

    await logOtpSendAttempt(admin, normalized.e164, ipHash, sent.provider);
    return NextResponse.json({ ok: true, provider: sent.provider, phone: normalized.e164 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'send_failed';
    return NextResponse.json({ code: 'otp_send_failed', message }, { status: 500 });
  }
}
