-- ============================================================
-- 045_local_spots_owner_minihome.sql
-- 로컬 가게 오너(프로필) + 공개 미니홈 슬러그·스킨·BGM·메뉴·레이아웃
-- 오너는 미니홈 관련 컬럼만 UPDATE (트리거), 관리자는 service_role 전체
-- ============================================================

alter table public.local_spots
  add column if not exists owner_profile_id uuid references public.profiles (id) on delete set null;

alter table public.local_spots
  add column if not exists minihome_public_slug text;

alter table public.local_spots
  add column if not exists minihome_intro text,
  add column if not exists minihome_theme jsonb not null default '{}'::jsonb,
  add column if not exists minihome_bgm_url text,
  add column if not exists minihome_menu jsonb not null default '[]'::jsonb,
  add column if not exists minihome_layout_modules jsonb not null default '["intro","menu","line","photos"]'::jsonb,
  add column if not exists minihome_extra jsonb not null default '{}'::jsonb;

comment on column public.local_spots.owner_profile_id is '가게 담당 로그인 계정(profiles.id = auth.uid). 미니홈 편집 권한.';
comment on column public.local_spots.minihome_public_slug is '공개 URL /shop/[slug] — 비우면 미니홈 비노출';
comment on column public.local_spots.minihome_menu is 'JSON 배열: [{name,price,description,image_url,sort_order}, ...]';

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'local_spots' and c.conname = 'local_spots_minihome_slug_format'
  ) then
    alter table public.local_spots
      add constraint local_spots_minihome_slug_format check (
        minihome_public_slug is null
        or (
          char_length(minihome_public_slug) between 4 and 40
          and (
            minihome_public_slug ~ '^[a-f0-9]{12}$'
            or minihome_public_slug ~ '^[a-z0-9][a-z0-9_-]{2,38}[a-z0-9]$'
          )
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'local_spots' and c.conname = 'local_spots_minihome_menu_array'
  ) then
    alter table public.local_spots
      add constraint local_spots_minihome_menu_array check (jsonb_typeof(minihome_menu) = 'array');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'local_spots' and c.conname = 'local_spots_minihome_layout_array'
  ) then
    alter table public.local_spots
      add constraint local_spots_minihome_layout_array check (jsonb_typeof(minihome_layout_modules) = 'array');
  end if;
end $$;

create unique index if not exists local_spots_minihome_public_slug_uidx
  on public.local_spots (minihome_public_slug)
  where minihome_public_slug is not null;

create index if not exists local_spots_owner_profile_id_idx
  on public.local_spots (owner_profile_id)
  where owner_profile_id is not null;

-- SELECT: 공개 행 + 본인 소유(비공개 편집용)
drop policy if exists local_spots_select_published on public.local_spots;
create policy local_spots_select_published
  on public.local_spots for select
  to anon, authenticated
  using (is_published = true or owner_profile_id = auth.uid());

-- 오너: 미니홈 필드만 수정 (트리거가 운영 필드 변경 차단)
drop policy if exists local_spots_update_owner_minihome on public.local_spots;
create policy local_spots_update_owner_minihome
  on public.local_spots for update
  to authenticated
  using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid());

create or replace function public.local_spots_restrict_owner_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if old.owner_profile_id is null or old.owner_profile_id is distinct from auth.uid() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.owner_profile_id is distinct from old.owner_profile_id
     or new.slug is distinct from old.slug
     or new.name is distinct from old.name
     or new.description is distinct from old.description
     or new.line_url is distinct from old.line_url
     or new.photo_urls is distinct from old.photo_urls
     or new.category is distinct from old.category
     or new.tags is distinct from old.tags
     or new.sort_order is distinct from old.sort_order
     or new.is_published is distinct from old.is_published
     or new.extra is distinct from old.extra
     or new.minihome_public_slug is distinct from old.minihome_public_slug
  then
    raise exception 'LOCAL_SPOT_OWNER_MINIHOME_ONLY: 소유자는 미니홈 콘텐츠(소개·테마·BGM·메뉴·레이아웃·minihome_extra)만 수정할 수 있습니다';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_local_spots_owner_guard on public.local_spots;
create trigger trg_local_spots_owner_guard
  before update on public.local_spots
  for each row
  execute function public.local_spots_restrict_owner_update();
