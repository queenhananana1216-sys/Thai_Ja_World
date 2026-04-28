/**
 * ADMIN_ALLOWED_EMAILS: 쉼표·세미콜론·공백으로 구분한 소문자 정규화 목록.
 * 보안 기본값은 "빈 목록 = 허용 없음" 입니다.
 */
export function parseAdminAllowedEmails(): string[] {
  const raw = process.env.ADMIN_ALLOWED_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes('@'));
}

/**
 * Bearer JWT에 실린 이메일이 관리자 API·삭제 권한에 해당하는지.
 * 화이트리스트 기반으로만 판단합니다.
 */
export function isAdminActorEmail(email: string | undefined | null): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const allowed = parseAdminAllowedEmails();
  return allowed.includes(e);
}
