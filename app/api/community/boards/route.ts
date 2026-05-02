/**
 * POST /api/community/boards — `/api/community/posts` 와 동일 본문
 * (광장 글쓰기 UI는 `posts` 테이블 INSERT; 레거시·문서 경로 호환)
 */
export { POST } from '../posts/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
