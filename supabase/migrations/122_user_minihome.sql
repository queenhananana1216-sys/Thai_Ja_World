-- =============================================================================
-- 122_user_minihome — 2026 미니홈 코어: minihomes + 다이어리/사진첩/방명록 + RLS
-- visibility: public | friends(일촌) | private — 백엔드(RLS)에서 강제
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enum
-- -----------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'minihome_visibility'
  ) then
    create type public.minihome_visibility as enum ('public', 'friends', 'private');
  end if;
end
$do$;

comment on type public.minihome_visibility is
  '미니홈 콘텐츠 공개 범위: 전체 | 일촌(friends) | 나만(private).';

grant usage on type public.minihome_visibility to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. 가시성 헬퍼 (RLS에서 공통 사용)
-- -----------------------------------------------------------------------------
create or replace function public.minihome_can_view_content(
  p_owner_id uuid,
  p_visibility public.minihome_visibility
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  home_public boolean;
  ilchon_ok boolean;
begin
  if p_owner_id is null then
    return false;
  end if;

  if uid is not null and uid = p_owner_id then
    return true;
  end if;

  select coalesce(h.is_public, false) into home_public
  from public.user_minihomes h
  where h.owner_id = p_owner_id;

  if not home_public then
    return false;
  end if;

  if p_visibility = 'private'::public.minihome_visibility then
    return false;
  end if;

  if p_visibility = 'public'::public.minihome_visibility then
    return true;
  end if;

  -- friends
  if uid is null then
    return false;
  end if;

  select exists (
    select 1 from public.ilchon_links l
    where (l.user_id = uid and l.peer_id = p_owner_id)
       or (l.user_id = p_owner_id and l.peer_id = uid)
  ) into ilchon_ok;

  return coalesce(ilchon_ok, false);
end;
$$;

comment on function public.minihome_can_view_content(uuid, public.minihome_visibility) is
  '미니홈 주인·비공개 미니홈·visibility·일촌 관계를 고려한 열람 가능 여부.';

alter function public.minihome_can_view_content(uuid, public.minihome_visibility) owner to postgres;
grant execute on function public.minihome_can_view_content(uuid, public.minihome_visibility) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Tables
-- -----------------------------------------------------------------------------
create table if not exists public.minihomes (
  owner_id uuid primary key references public.user_minihomes (owner_id) on delete cascade,
  status_message text not null default '',
  skin jsonb not null default '{}'::jsonb,
  bgm text,
  visibility public.minihome_visibility not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint minihomes_status_len check (char_length(status_message) <= 500)
);

comment on table public.minihomes is '미니홈 셸: 상태메시지·스킨·BGM (user_minihomes 1:1 확장).';

drop trigger if exists trg_minihomes_updated_at on public.minihomes;
create trigger trg_minihomes_updated_at
  before update on public.minihomes
  for each row execute function public.set_updated_at();

create table if not exists public.minihome_diaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.user_minihomes (owner_id) on delete cascade,
  title text not null default '',
  body text not null default '',
  mood text,
  visibility public.minihome_visibility not null default 'friends',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint minihome_diaries_title_len check (char_length(title) <= 200),
  constraint minihome_diaries_body_len check (char_length(body) <= 12000)
);

comment on table public.minihome_diaries is '미니홈 다이어리 (행별 visibility).';

create index if not exists idx_minihome_diaries_owner_created
  on public.minihome_diaries (owner_id, created_at desc);

drop trigger if exists trg_minihome_diaries_updated_at on public.minihome_diaries;
create trigger trg_minihome_diaries_updated_at
  before update on public.minihome_diaries
  for each row execute function public.set_updated_at();

create table if not exists public.minihome_galleries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.user_minihomes (owner_id) on delete cascade,
  title text not null,
  description text,
  cover_storage_path text,
  items jsonb not null default '[]'::jsonb,
  visibility public.minihome_visibility not null default 'public',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint minihome_galleries_title_len check (char_length(title) <= 200),
  constraint minihome_galleries_items_array check (jsonb_typeof(items) = 'array')
);

comment on table public.minihome_galleries is '미니홈 사진첩. items: [{ "path": string, "caption"?: string }]';

create index if not exists idx_minihome_galleries_owner_sort
  on public.minihome_galleries (owner_id, sort_order, created_at desc);

drop trigger if exists trg_minihome_galleries_updated_at on public.minihome_galleries;
create trigger trg_minihome_galleries_updated_at
  before update on public.minihome_galleries
  for each row execute function public.set_updated_at();

create table if not exists public.minihome_guestbooks (
  id uuid primary key default gen_random_uuid(),
  minihome_owner_id uuid not null references public.user_minihomes (owner_id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  visibility public.minihome_visibility not null default 'public',
  created_at timestamptz not null default now(),
  constraint minihome_guestbooks_body_len check (char_length(body) <= 2000)
);

comment on table public.minihome_guestbooks is '미니홈 방명록·일촌평 (행별 visibility).';

create index if not exists idx_minihome_guestbooks_owner_created
  on public.minihome_guestbooks (minihome_owner_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 4. user_minihomes → minihomes 자동 생성 (신규 가입·백필 이후 행)
-- -----------------------------------------------------------------------------
create or replace function public.trg_ensure_minihomes_row()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.minihomes (owner_id, skin, status_message)
  values (
    new.owner_id,
    coalesce(new.theme, '{}'::jsonb),
    ''
  )
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

alter function public.trg_ensure_minihomes_row() owner to postgres;

drop trigger if exists trg_user_minihomes_ensure_minihomes on public.user_minihomes;
create trigger trg_user_minihomes_ensure_minihomes
  after insert on public.user_minihomes
  for each row execute function public.trg_ensure_minihomes_row();

-- 기존 회원 백필
insert into public.minihomes (owner_id, skin, status_message, visibility)
select
  m.owner_id,
  coalesce(m.theme, '{}'::jsonb),
  '',
  'public'::public.minihome_visibility
from public.user_minihomes m
on conflict (owner_id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. RLS
-- -----------------------------------------------------------------------------
alter table public.minihomes enable row level security;

drop policy if exists minihomes_select on public.minihomes;
create policy minihomes_select on public.minihomes
  for select
  using (
    public.minihome_can_view_content(owner_id, visibility)
  );

drop policy if exists minihomes_insert_own on public.minihomes;
create policy minihomes_insert_own on public.minihomes
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists minihomes_update_own on public.minihomes;
create policy minihomes_update_own on public.minihomes
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
alter table public.minihome_diaries enable row level security;

drop policy if exists minihome_diaries_select on public.minihome_diaries;
create policy minihome_diaries_select on public.minihome_diaries
  for select
  using (public.minihome_can_view_content(owner_id, visibility));

drop policy if exists minihome_diaries_insert_own on public.minihome_diaries;
create policy minihome_diaries_insert_own on public.minihome_diaries
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists minihome_diaries_update_own on public.minihome_diaries;
create policy minihome_diaries_update_own on public.minihome_diaries
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists minihome_diaries_delete_own on public.minihome_diaries;
create policy minihome_diaries_delete_own on public.minihome_diaries
  for delete to authenticated
  using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
alter table public.minihome_galleries enable row level security;

drop policy if exists minihome_galleries_select on public.minihome_galleries;
create policy minihome_galleries_select on public.minihome_galleries
  for select
  using (public.minihome_can_view_content(owner_id, visibility));

drop policy if exists minihome_galleries_insert_own on public.minihome_galleries;
create policy minihome_galleries_insert_own on public.minihome_galleries
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists minihome_galleries_update_own on public.minihome_galleries;
create policy minihome_galleries_update_own on public.minihome_galleries
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists minihome_galleries_delete_own on public.minihome_galleries;
create policy minihome_galleries_delete_own on public.minihome_galleries
  for delete to authenticated
  using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
alter table public.minihome_guestbooks enable row level security;

drop policy if exists minihome_guestbooks_select on public.minihome_guestbooks;
create policy minihome_guestbooks_select on public.minihome_guestbooks
  for select
  using (
    author_id = auth.uid()
    or public.minihome_can_view_content(minihome_owner_id, visibility)
  );

drop policy if exists minihome_guestbooks_insert_auth on public.minihome_guestbooks;
create policy minihome_guestbooks_insert_auth on public.minihome_guestbooks
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.user_minihomes h
      where h.owner_id = minihome_guestbooks.minihome_owner_id
        and (h.is_public = true or h.owner_id = auth.uid())
    )
  );

drop policy if exists minihome_guestbooks_update_moderate on public.minihome_guestbooks;
create policy minihome_guestbooks_update_moderate on public.minihome_guestbooks
  for update to authenticated
  using (minihome_owner_id = auth.uid() or author_id = auth.uid())
  with check (minihome_owner_id = auth.uid() or author_id = auth.uid());

drop policy if exists minihome_guestbooks_delete_moderate on public.minihome_guestbooks;
create policy minihome_guestbooks_delete_moderate on public.minihome_guestbooks
  for delete to authenticated
  using (minihome_owner_id = auth.uid() or author_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 6. Grants
-- -----------------------------------------------------------------------------
grant select on table public.minihomes to anon, authenticated;
grant insert, update on table public.minihomes to authenticated;

grant select on table public.minihome_diaries to anon, authenticated;
grant insert, update, delete on table public.minihome_diaries to authenticated;

grant select on table public.minihome_galleries to anon, authenticated;
grant insert, update, delete on table public.minihome_galleries to authenticated;

grant select on table public.minihome_guestbooks to anon, authenticated;
grant insert, update, delete on table public.minihome_guestbooks to authenticated;

-- PostgREST 스키마 캐시
notify pgrst, 'reload_schema';
