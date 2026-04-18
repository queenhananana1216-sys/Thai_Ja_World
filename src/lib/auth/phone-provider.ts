import 'server-only';

import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';
import { featureFlags } from '@/lib/flags';

export type PhoneAuthProviderName = 'supabase' | 'twilio';

export type PhoneAuthErrorCode =
  | 'invalid_phone'
  | 'invalid_code'
  | 'otp_rate_limited_phone'
  | 'otp_rate_limited_ip'
  | 'provider_unavailable'
  | 'otp_send_failed'
  | 'otp_verify_failed';

export type PhoneSendResult =
  | { ok: true; provider: PhoneAuthProviderName }
  | { ok: false; code: PhoneAuthErrorCode; message: string };

export type PhoneVerifyResult =
  | { ok: true; provider: PhoneAuthProviderName }
  | { ok: false; code: PhoneAuthErrorCode; message: string };

export type PhoneAuthProvider = {
  readonly name: PhoneAuthProviderName;
  sendOtp(phoneE164: string): Promise<PhoneSendResult>;
  verifyOtp(phoneE164: string, code: string): Promise<PhoneVerifyResult>;
};

function sanitizeCode(code: string): string {
  return code.replace(/\D/g, '').slice(0, 8);
}

function createSupabasePhoneProvider(): PhoneAuthProvider {
  return {
    name: 'supabase',
    async sendOtp(phoneE164) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
      if (!url || !anon) {
        return { ok: false, code: 'provider_unavailable', message: 'supabase_env_missing' };
      }
      const sb = createClient(url, anon, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await sb.auth.signInWithOtp({
        phone: phoneE164,
        options: { shouldCreateUser: true },
      });
      if (error) {
        return { ok: false, code: 'otp_send_failed', message: error.message };
      }
      return { ok: true, provider: 'supabase' };
    },
    async verifyOtp(phoneE164, code) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
      if (!url || !anon) {
        return { ok: false, code: 'provider_unavailable', message: 'supabase_env_missing' };
      }
      const sb = createClient(url, anon, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const cleaned = sanitizeCode(code);
      if (cleaned.length < 6) {
        return { ok: false, code: 'invalid_code', message: 'otp_too_short' };
      }
      const { error } = await sb.auth.verifyOtp({
        phone: phoneE164,
        token: cleaned,
        type: 'sms',
      });
      if (error) {
        return { ok: false, code: 'otp_verify_failed', message: error.message };
      }
      return { ok: true, provider: 'supabase' };
    },
  };
}

function createTwilioPhoneProvider(): PhoneAuthProvider {
  return {
    name: 'twilio',
    async sendOtp(phoneE164) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
      const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
      if (!accountSid || !authToken || !verifyServiceSid) {
        return { ok: false, code: 'provider_unavailable', message: 'twilio_env_missing' };
      }
      try {
        const client = Twilio(accountSid, authToken);
        await client.verify.v2.services(verifyServiceSid).verifications.create({
          to: phoneE164,
          channel: 'sms',
        });
        return { ok: true, provider: 'twilio' };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'twilio_send_failed';
        return { ok: false, code: 'otp_send_failed', message };
      }
    },
    async verifyOtp(phoneE164, code) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
      const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
      if (!accountSid || !authToken || !verifyServiceSid) {
        return { ok: false, code: 'provider_unavailable', message: 'twilio_env_missing' };
      }
      const cleaned = sanitizeCode(code);
      if (cleaned.length < 6) {
        return { ok: false, code: 'invalid_code', message: 'otp_too_short' };
      }
      try {
        const client = Twilio(accountSid, authToken);
        const result = await client.verify.v2.services(verifyServiceSid).verificationChecks.create({
          to: phoneE164,
          code: cleaned,
        });
        if (result.status !== 'approved') {
          return { ok: false, code: 'otp_verify_failed', message: `twilio_status_${result.status}` };
        }
        return { ok: true, provider: 'twilio' };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'twilio_verify_failed';
        return { ok: false, code: 'otp_verify_failed', message };
      }
    },
  };
}

export function getPhoneAuthProvider(): PhoneAuthProvider {
  const raw = process.env.PHONE_AUTH_PROVIDER?.trim().toLowerCase();
  if (raw === 'twilio' && featureFlags.twilioVerifyV1) return createTwilioPhoneProvider();
  return createSupabasePhoneProvider();
}
