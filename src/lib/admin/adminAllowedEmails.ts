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
