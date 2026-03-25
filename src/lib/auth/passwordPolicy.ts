/**
 * 비밀번호 정책 — 서버/클라이언트 공통 (무료, 본인 확인 강화의 최소선)
 * UI 문구는 dictionaries `auth` 에서 넘깁니다 (ko/th).
 */
const MIN_LEN = 8;
const MAX_LEN = 128;

export type PasswordCheckResult = { ok: true } | { ok: false; message: string };

export type PasswordPolicyMessages = {
  tooShort: string;
  tooLong: string;
  needLetterDigit: string;
  banned: string;
};

function fillMinMax(template: string): string {
  return template.replace(/\{min\}/g, String(MIN_LEN)).replace(/\{max\}/g, String(MAX_LEN));
}

/** 문자(유니코드 글자) 1개 이상 + 숫자 1개 이상 */
export function checkPasswordStrength(
  password: string,
  msg: PasswordPolicyMessages,
): PasswordCheckResult {
  const p = password ?? '';
  if (p.length < MIN_LEN) {
    return { ok: false, message: fillMinMax(msg.tooShort) };
  }
  if (p.length > MAX_LEN) {
    return { ok: false, message: fillMinMax(msg.tooLong) };
  }
  const hasLetter = /\p{L}/u.test(p);
  const hasDigit = /\p{N}/u.test(p);
  if (!hasLetter || !hasDigit) {
    return { ok: false, message: msg.needLetterDigit };
  }
  const lower = p.toLowerCase();
  const banned = ['password', '12345678', '11111111', 'qwerty123', 'thailand1'];
  if (banned.includes(lower)) {
    return { ok: false, message: msg.banned };
  }
  return { ok: true };
}
