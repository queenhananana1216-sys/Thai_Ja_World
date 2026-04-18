import type { Dictionary } from '@/i18n/dictionaries';

type AuthStrings = Dictionary['auth'];

export function mapPhoneApiError(
  code: string | null | undefined,
  fallback: string,
  a: AuthStrings,
): string {
  switch (code) {
    case 'invalid_phone':
      return a.phoneAuthInvalidPhone;
    case 'invalid_code':
      return a.phoneAuthOtpHint;
    case 'otp_rate_limited_phone':
    case 'otp_rate_limited_ip':
      return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
    case 'provider_unavailable':
      return '지금은 문자 인증 공급자 연결이 준비되지 않았어요. 잠시 후 다시 시도해 주세요.';
    default:
      return fallback;
  }
}
