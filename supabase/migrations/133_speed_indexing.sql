-- =============================================================================
-- 133_speed_indexing.sql
-- 메인 화면·로컬 미니홈 고빈도 조회 보조 인덱스
-- PostgREST 스키마 캐시: notify pgrst, 'reload_schema';
-- =============================================================================
-- board_posts: 테이블에는 category 컬럼이 없고 board_type(free|info)이 구분 컬럼임.

create index if not exists idx_board_posts_category
  on public.board_posts (board_type);

create index if not exists idx_local_spots_slug
  on public.local_spots (slug);

create index if not exists idx_local_menus_spot_id
  on public.local_menus (local_spot_id);

notify pgrst, 'reload_schema';
