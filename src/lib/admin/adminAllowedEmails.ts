/**
 * ADMIN_ALLOWED_EMAILS: 쉼표·세미콜론·공백으로 구분한 소문자 정규화 목록.
 * 비어 있으면(미설정) 기존처럼 로그인만 되면 /admin 접근 허용.
 */
export function parseAdminAllowedEmails(): string[] {
  const raw = process.env.ADMIN_ALLOWED_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes('@'));
}
