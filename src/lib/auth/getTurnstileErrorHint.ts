const CODE_HINTS: Record<string, string> = {
  'missing-input-secret': '서버에서 TURNSTILE_SECRET_KEY를 받지 못했어요(서버 설정 확인 필요).',
  'invalid-input-secret': 'TURNSTILE_SECRET_KEY가 올바르지 않거나 만료됐을 수 있어요(Cloudflare에서 Secret Key 재확인).',
  'missing-input-response': 'Turnstile 토큰이 비어 있어요. 보안 확인을 다시 완료해 주세요.',
  'invalid-input-response': 'Turnstile 토큰이 만료/손상됐거나 사이트 설정과 맞지 않아요. 보안 확인을 새로 완료해 주세요.',
  'bad-request': '서버 요청 형식이 올바르지 않을 수 있어요. 개발 환경에서 요청 payload를 확인해 주세요.',
  'timeout-or-duplicate': '토큰이 이미 사용됐거나 만료됐어요. 보안 확인을 새로 완료해 주세요.',
  'internal-error': 'Turnstile 서버 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
};

export function getTurnstileErrorHint(codes?: string[] | null): string | null {
  const arr = (codes ?? []).filter(Boolean);
  if (arr.length === 0) return null;

  const firstMatch = arr.find((c) => Object.prototype.hasOwnProperty.call(CODE_HINTS, c));
  const hint = firstMatch ? CODE_HINTS[firstMatch] : undefined;
  const codeTail = ` (error-codes: ${arr.join(', ')})`;
  return hint ? `${hint}${codeTail}` : codeTail;
}

