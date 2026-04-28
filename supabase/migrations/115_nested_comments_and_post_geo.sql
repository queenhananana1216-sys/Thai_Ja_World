-- 115_nested_comments_and_post_geo
-- 2026 커뮤니티 코어 확장:
-- 1) comments.parent_comment_id (self reference) for nested replies
-- 2) posts.latitude / longitude / location_name for geo posts

begin;

-- ---------------------------------------------------------------------------
-- comments: nested tree support
-- ---------------------------------------------------------------------------
alter table public.comments
  add column if not exists parent_comment_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_parent_comment_id_fkey'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_parent_comment_id_fkey
      foreign key (parent_comment_id)
      references public.comments(id)
      on delete cascade;
  end if;
end $$;

create index if not exists idx_comments_parent_comment_id
  on public.comments (parent_comment_id, created_at);

comment on column public.comments.parent_comment_id is
  '대댓글 트리용 자기 참조 부모 댓글 ID (null = 최상위 댓글)';

-- ---------------------------------------------------------------------------
-- posts: geo location support
-- ---------------------------------------------------------------------------
alter table public.posts
  add column if not exists latitude double precision null,
  add column if not exists longitude double precision null,
  add column if not exists location_name text null;

alter table public.posts
  drop constraint if exists posts_latitude_range_ck,
  drop constraint if exists posts_longitude_range_ck,
  drop constraint if exists posts_lat_lng_pair_ck,
  drop constraint if exists posts_location_name_len_ck;

alter table public.posts
  add constraint posts_latitude_range_ck
    check (latitude is null or (latitude >= -90 and latitude <= 90)),
  add constraint posts_longitude_range_ck
    check (longitude is null or (longitude >= -180 and longitude <= 180)),
  add constraint posts_lat_lng_pair_ck
    check (
      (latitude is null and longitude is null)
      or (latitude is not null and longitude is not null)
    ),
  add constraint posts_location_name_len_ck
    check (location_name is null or char_length(location_name) <= 120);

create index if not exists idx_posts_geo
  on public.posts (category, latitude, longitude);

comment on column public.posts.latitude is
  '게시글 첨부 위치 위도 (GPS)';
comment on column public.posts.longitude is
  '게시글 첨부 위치 경도 (GPS)';
comment on column public.posts.location_name is
  '게시글 첨부 위치 이름(선택)';

commit;
