/**
 * 검색·안내용 — 해당 경로의 «본문·커뮤니티 참여»가 회원 전용인지(로그인 필요 표시)
 * 홈 `/`·인증 경로만 공개 안내 수준으로 표시.
 */
export function sitePathRequiresMemberContent(href: string): boolean {
  const path = href.split('?')[0] ?? href;
  if (path === '/' || path === '') return false;
  if (path.startsWith('/auth/')) return false;
  return true;
}
