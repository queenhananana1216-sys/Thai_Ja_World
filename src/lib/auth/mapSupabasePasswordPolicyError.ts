/**
 * Supabase Auth가 반환하는 비밀번호 정책 관련 영문 메시지를 로케일 친화 문구로 치환합니다.
 */

export function isLikelySupabasePasswordPolicyMessage(raw: string): boolean {
  const m = raw.trim().toLowerCase();
  if (!m) return false;

  if (
    m.includes('password should') ||
    m.includes('password must') ||
    m.includes('password requirements') ||
    m.includes('password policy') ||
    m.includes('weak password') ||
    m.includes('characters of each') ||
    m.includes('at least one character') ||
    (m.includes('password') && m.includes('least') && m.includes('character'))
  ) {
    return true;
  }

  if (
    m.includes('uppercase') &&
    m.includes('lowercase') &&
    (m.includes('digit') || m.includes('number'))
  ) {
    return true;
  }

  return false;
}

/** 비밀번호 정책으로 추정되면 friendly 로 치환, 아니면 원문 유지 */
export function mapSupabasePasswordPolicyError(raw: string, friendlyMessage: string): string {
  if (isLikelySupabasePasswordPolicyMessage(raw)) return friendlyMessage;
  return raw;
}
