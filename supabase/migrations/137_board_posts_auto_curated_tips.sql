-- =============================================================================
-- 137_board_posts_auto_curated_tips.sql
-- 크론 자동 큐레이션(board_posts): HOT 플래그·표시용 필명·tips 타입
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) board_type 에 tips (운영 자동 발행 전용, 일반 유저 JWT 작성 불가)
-- ---------------------------------------------------------------------------
alter table public.board_posts
  drop constraint if exists board_posts_board_type_check;

alter table public.board_posts
  add constraint board_posts_board_type_check
  check (board_type in ('free', 'info', 'reports', 'tips'));

comment on column public.board_posts.board_type is
  'free: 자유, info: 정보 공유, reports: 검증 제보, tips: 운영 자동 생활·여행 큐레이션(서비스 롤 전용)';

-- ---------------------------------------------------------------------------
-- 2) 자동 발행·피드 노출 플래그
-- ---------------------------------------------------------------------------
alter table public.board_posts
  add column if not exists home_highlight boolean not null default false;

alter table public.board_posts
  add column if not exists auto_curated boolean not null default false;

alter table public.board_posts
  add column if not exists display_author_label text null;

comment on column public.board_posts.home_highlight is
  '홈 통합 피드 등에서 HOT(🔥) 강조 — 자동 큐레이션 글은 true 권장';

comment on column public.board_posts.auto_curated is
  '크론 고스트라이터 등 자동 생성·편집 초안 글';

comment on column public.board_posts.display_author_label is
  '표시 전용 작성자명 — 설정 시 카드·상세에서 우선 노출';

create index if not exists idx_board_posts_auto_curated_created
  on public.board_posts (auto_curated, created_at desc)
  where auto_curated = true;

-- ---------------------------------------------------------------------------
-- 3) 서비스 RPC — tips 허용 (관리·크론 보조 경로)
-- ---------------------------------------------------------------------------
create or replace function public.board_posts_insert_for_service(
  p_user_id uuid,
  p_board_type text,
  p_title text,
  p_content text,
  p_image_urls text[],
  p_lat double precision,
  p_lng double precision,
  p_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_board_type is null or p_board_type not in ('free', 'info', 'reports', 'tips') then
    raise exception 'invalid_board_type';
  end if;
  if p_title is null or length(trim(p_title)) < 1 or length(trim(p_title)) > 200 then
    raise exception 'invalid_title';
  end if;
  if (p_lat is null) is distinct from (p_lng is null) then
    raise exception 'lat_lng_pair_required';
  end if;

  insert into public.board_posts (
    user_id,
    board_type,
    title,
    content,
    image_urls,
    lat,
    lng,
    address
  )
  values (
    p_user_id,
    p_board_type,
    trim(p_title),
    coalesce(p_content, ''),
    coalesce(p_image_urls, '{}'::text[]),
    p_lat,
    p_lng,
    p_address
  )
  returning id into v_id;

  return v_id;
end;
$$;

alter function public.board_posts_insert_for_service(uuid, text, text, text, text[], double precision, double precision, text) owner to postgres;

notify pgrst, 'reload_schema';

commit;
