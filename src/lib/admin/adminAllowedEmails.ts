/**
 * ADMIN_ALLOWED_EMAILS: 쉼표·세미콜론·공백으로 구분한 소문자 정규화 목록.
 * 비어 있으면(미설정) 로그인한 계정만 /admin 접근(소규모·개발용). 운영에서는 반드시 이메일을 지정하세요.
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
 * {@link resolveAdminAccess} 와 동일: 화이트리스트가 비어 있으면(개발용) 이메일만 있으면 true.
 */
export function isAdminActorEmail(email: string | undefined | null): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const allowed = parseAdminAllowedEmails();
  if (allowed.length > 0) {
    return allowed.includes(e);
  }
  return true;
}
