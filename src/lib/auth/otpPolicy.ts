import 'server-only';

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PhoneAuthErrorCode } from './phone-provider';

export const OTP_POLICY = {
  cooldownSec: 60,
  perPhonePerHour: 6,
  perIpPer10Min: 20,
} as const;

export function readClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0]?.trim();
    if (ip) return ip;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

export function hashIp(rawIp: string): string {
  return createHash('sha256').update(rawIp).digest('hex');
}

export function mapPhoneProviderError(code: PhoneAuthErrorCode, message: string): {
  status: number;
  code: PhoneAuthErrorCode;
  message: string;
} {
  if (code === 'otp_rate_limited_phone' || code === 'otp_rate_limited_ip') {
    return { status: 429, code, message };
  }
  if (code === 'invalid_phone' || code === 'invalid_code') {
    return { status: 400, code, message };
  }
  return { status: 502, code, message };
}

export function isSupportedPhoneMarket(phoneE164: string): boolean {
  return /^\+66\d{8,11}$/.test(phoneE164) || /^\+82\d{8,11}$/.test(phoneE164);
}

export async function assertOtpSendPolicy(
  admin: SupabaseClient,
  phoneE164: string,
  ipHash: string,
): Promise<
  | { ok: true }
  | { ok: false; code: 'otp_rate_limited_phone' | 'otp_rate_limited_ip'; retryAfterSec: number }
> {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const tenMinAgo = new Date(now - 10 * 60 * 1000).toISOString();

  const { count: phoneCount, error: phoneCountError } = await admin
    .from('phone_otp_requests')
    .select('id', { count: 'exact', head: true })
    .eq('phone_e164', phoneE164)
    .gte('created_at', oneHourAgo);
  if (phoneCountError) {
    throw new Error(phoneCountError.message);
  }
  if ((phoneCount ?? 0) >= OTP_POLICY.perPhonePerHour) {
    return { ok: false, code: 'otp_rate_limited_phone', retryAfterSec: OTP_POLICY.cooldownSec };
  }

  const { count: ipCount, error: ipCountError } = await admin
    .from('phone_otp_requests')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', tenMinAgo);
  if (ipCountError) {
    throw new Error(ipCountError.message);
  }
  if ((ipCount ?? 0) >= OTP_POLICY.perIpPer10Min) {
    return { ok: false, code: 'otp_rate_limited_ip', retryAfterSec: OTP_POLICY.cooldownSec };
  }

  const { data: latestRows, error: latestError } = await admin
    .from('phone_otp_requests')
    .select('created_at')
    .eq('phone_e164', phoneE164)
    .order('created_at', { ascending: false })
    .limit(1);
  if (latestError) {
    throw new Error(latestError.message);
  }
  const latestAt = latestRows?.[0]?.created_at ? new Date(latestRows[0].created_at).getTime() : null;
  if (latestAt) {
    const elapsedSec = Math.floor((now - latestAt) / 1000);
    if (elapsedSec < OTP_POLICY.cooldownSec) {
      return {
        ok: false,
        code: 'otp_rate_limited_phone',
        retryAfterSec: OTP_POLICY.cooldownSec - elapsedSec,
      };
    }
  }
  return { ok: true };
}

export async function logOtpSendAttempt(
  admin: SupabaseClient,
  phoneE164: string,
  ipHash: string,
  provider: 'supabase' | 'twilio',
) {
  const { error } = await admin.from('phone_otp_requests').insert({
    phone_e164: phoneE164,
    ip_hash: ipHash,
    provider,
  });
  if (error) {
    throw new Error(error.message);
  }
}
