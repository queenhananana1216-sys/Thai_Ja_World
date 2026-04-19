import { shouldRefreshTurnstileFromAuthMessage } from '@/lib/auth/verifyTurnstileClient';

const CODE_HINTS: Record<string, string> = {
  'missing-input-secret': '보안 확인 설정이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.',
  'invalid-input-secret': '보안 확인 설정을 다시 점검 중이에요. 잠시 후 다시 시도해 주세요.',
  'missing-input-response': 'Turnstile 토큰이 비어 있어요. 보안 확인을 다시 완료해 주세요.',
  'invalid-input-response': 'Turnstile 토큰이 만료/손상됐거나 사이트 설정과 맞지 않아요. 보안 확인을 새로 완료해 주세요.',
  'bad-request': '보안 확인 요청 형식이 올바르지 않았어요. 다시 시도해 주세요.',
  'timeout-or-duplicate': '토큰이 이미 사용됐거나 만료됐어요. 보안 확인을 새로 완료해 주세요.',
  'internal-error': 'Turnstile 서버 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
};

export function getTurnstileErrorHint(codes?: string[] | null): string | null {
  const arr = (codes ?? []).filter(Boolean);
  if (arr.length === 0) return null;

  const firstMatch = arr.find((c) => Object.prototype.hasOwnProperty.call(CODE_HINTS, c));
  if (!firstMatch) {
    return '보안 확인 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
  }
  return CODE_HINTS[firstMatch] ?? null;
}

/**
 * Supabase Auth 가 돌려주는 captcha/Turnstile 관련 메시지를 사용자용 문구로 바꾸고,
 * 위젯을 다시 그려야 할지 알려 준다. (토큰 1회용·만료 시)
 */
export function userFacingCaptchaAuthError(
  rawMessage: string,
  turnstileVerifyFailedLabel: string,
): { message: string; remountTurnstile: boolean } {
  if (!shouldRefreshTurnstileFromAuthMessage(rawMessage)) {
    return { message: rawMessage, remountTurnstile: false };
  }
  const lower = rawMessage.toLowerCase();
  const codes: string[] =
    lower.includes('timeout-or-duplicate') || lower.includes('duplicate')
      ? ['timeout-or-duplicate']
      : lower.includes('invalid-input-secret') || lower.includes('secret')
        ? ['invalid-input-secret']
        : ['invalid-input-response'];
  const hint = getTurnstileErrorHint(codes);
  return {
    message: hint ? `${turnstileVerifyFailedLabel} ${hint}` : turnstileVerifyFailedLabel,
    remountTurnstile: true,
  };
}

