/**
 * POST /api/community/boards — `/api/community/posts` 와 동일 핸들러
 * 게시글 INSERT 는 `SUPABASE_SERVICE_ROLE_KEY` 만 사용 (anon 금지); 검증은 `posts/route.ts` POST 시작 시 수행.
 */
export { POST } from '../posts/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
