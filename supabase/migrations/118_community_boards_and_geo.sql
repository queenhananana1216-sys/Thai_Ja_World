-- =============================================================================
-- 118_community_boards_and_geo.sql
-- 자유(free) / 정보 공유(info) 게시판, 지오 필드, 일일 로컬 정보 공유 퀘스트,
-- board_images 스토리지 버킷
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) board_posts
-- ---------------------------------------------------------------------------
create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  board_type text not null check (board_type in ('free', 'info')),
  title text not null,
  content text not null default '',
  image_urls text[] not null default '{}'::text[],
  lat double precision null,
  lng double precision null,
  address text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_posts_title_nonempty check (char_length(trim(title)) > 0),
  constraint board_posts_lat_range_ck check (lat is null or (lat >= -90 and lat <= 90)),
  constraint board_posts_lng_range_ck check (lng is null or (lng >= -180 and lng <= 180)),
  constraint board_posts_lat_lng_pair_ck check (
    (lat is null and lng is null)
    or (lat is not null and lng is not null)
  ),
  constraint board_posts_address_len_ck check (address is null or char_length(address) <= 500)
);

create index if not exists idx_board_posts_user_created
  on public.board_posts (user_id, created_at desc);

create index if not exists idx_board_posts_board_type_created
  on public.board_posts (board_type, created_at desc);

create index if not exists idx_board_posts_geo
  on public.board_posts (lat, lng)
  where lat is not null and lng is not null;

comment on table public.board_posts is
  '커뮤니티 통합 게시판: 자유(free) / 정보 공유(info, 지도·주소 옵션)';

comment on column public.board_posts.board_type is
  'free: 자유 게시판, info: 위치 정보 포함 정보 공유 게시판';

drop trigger if exists trg_board_posts_updated_at on public.board_posts;
create trigger trg_board_posts_updated_at
  before update on public.board_posts
  for each row execute function public.set_updated_at();

alter table public.board_posts enable row level security;

drop policy if exists board_posts_select_public on public.board_posts;
create policy board_posts_select_public on public.board_posts
  for select to anon, authenticated
  using (true);

drop policy if exists board_posts_insert_own on public.board_posts;
create policy board_posts_insert_own on public.board_posts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists board_posts_update_own on public.board_posts;
create policy board_posts_update_own on public.board_posts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists board_posts_delete_own on public.board_posts;
create policy board_posts_delete_own on public.board_posts
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2) 일일 로컬 정보 공유 퀘스트 (옥수수/도토리 UI 노출과 동일 계열: reward_corn → style_score_total)
-- ---------------------------------------------------------------------------
insert into public.quest_definitions (
  quest_code,
  title_ko,
  title_th,
  description_ko,
  description_th,
  period_type,
  event_type,
  goal_count,
  reward_corn,
  active
)
values (
  'daily_local_info_share',
  '오늘 로컬 정보 1건 공유하기',
  'แชร์ข้อมูลท้องถิ่นวันนี้ 1 ครั้ง',
  '정보 공유 게시판에 위치 기반 글을 1건 올려 보세요.',
  'โพสต์ข้อมูลท้องถิ่นในกระดานแชร์ 1 ครั้ง',
  'daily',
  'local_info_share',
  1,
  18,
  true
)
on conflict (quest_code) do update
  set title_ko = excluded.title_ko,
      title_th = excluded.title_th,
      description_ko = excluded.description_ko,
      description_th = excluded.description_th,
      period_type = excluded.period_type,
      event_type = excluded.event_type,
      goal_count = excluded.goal_count,
      reward_corn = excluded.reward_corn,
      active = excluded.active;

-- ---------------------------------------------------------------------------
-- 3) info 게시글 작성 시 퀘스트 진행·정산 (기존 quest_record_progress 파이프라인)
-- ---------------------------------------------------------------------------
create or replace function public.board_posts_after_insert_info_quest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.board_type is distinct from 'info' then
    return new;
  end if;

  perform public.quest_record_progress(
    new.user_id,
    'local_info_share',
    1,
    'board_posts',
    format('local_info_share:%s:%s', new.user_id, to_char(current_date, 'YYYY-MM-DD')),
    jsonb_build_object(
      'board_post_id', new.id,
      'board_type', new.board_type
    )
  );

  return new;
end;
$$;

alter function public.board_posts_after_insert_info_quest() owner to postgres;

drop trigger if exists trg_board_posts_after_insert_info_quest on public.board_posts;
create trigger trg_board_posts_after_insert_info_quest
  after insert on public.board_posts
  for each row
  execute function public.board_posts_after_insert_info_quest();

-- ---------------------------------------------------------------------------
-- 4) Storage: board_images (없으면 생성 + 공개 읽기 / 본인 쓰기)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'board_images',
  'board_images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "board_images_select_public" on storage.objects;
create policy "board_images_select_public"
  on storage.objects for select
  using (bucket_id = 'board_images');

drop policy if exists "board_images_insert_authenticated" on storage.objects;
create policy "board_images_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'board_images');

drop policy if exists "board_images_update_own" on storage.objects;
create policy "board_images_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'board_images' and owner = auth.uid());

drop policy if exists "board_images_delete_own" on storage.objects;
create policy "board_images_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'board_images' and owner = auth.uid());
