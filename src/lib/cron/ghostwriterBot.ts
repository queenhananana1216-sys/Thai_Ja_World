/**
 * 고스트라이터(cron/auto-content) 전용 시스템 사용자 — board_posts.user_id FK(public.profiles)
 * 마이그레이션 `138_ghostwriter_system_bot.sql` 과 동일 ID 유지.
 */
export const GHOSTWRITER_SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001' as const;
