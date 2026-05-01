-- 121_sync_posts_location
-- posts에 위치·주소 컬럼이 누락된 레거시 DB도 흡수하고 PostgREST 스키마 캐시를 갱신한다.

begin;

alter table public.posts
  add column if not exists latitude double precision null,
  add column if not exists longitude double precision null,
  add column if not exists address text null;

comment on column public.posts.address is
  '선택 주소 문자열 (구인구직·통합 위치 표기 등)';

commit;

notify pgrst, 'reload_schema';
