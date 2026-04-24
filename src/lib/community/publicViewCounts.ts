/**
 * 조회수: `posts.view_count` 컬럼·SELECT·향후 증가 API는 그대로 두고,
 * 이용자가 적을 때는 **공개 UI·JsonLd** 에서만 숨깁니다.
 *
 * 다시 켜기: `NEXT_PUBLIC_COMMUNITY_PUBLIC_VIEW_COUNTS=true` (Vercel env)
 */
export function isCommunityPublicViewCountsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_COMMUNITY_PUBLIC_VIEW_COUNTS === 'true';
}
