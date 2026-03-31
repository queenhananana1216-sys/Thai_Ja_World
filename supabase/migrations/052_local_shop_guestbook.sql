-- =============================================================================
-- 052_local_shop_guestbook.sql
-- 로컬 가게(/shop) 전용 방명록 + 오너 갤러리(photo_urls) 편집 허용
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 가게 방명록 (개인 미니홈 minihome_guestbook_entries 와 분리)
-- -----------------------------------------------------------------------------
create table if not exists public.local_shop_guestbook_entries (
  id            uuid primary key default gen_random_uuid(),
  local_spot_id uuid not null references public.local_spots (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  body          text not null,
  is_hidden     boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint local_shop_guestbook_body_len check (char_length(body) >= 1 and char_length(body) <= 2000)
);

create index if not exists idx_local_shop_gb_spot_created
  on public.local_shop_guestbook_entries (local_spot_id, created_at desc);

create index if not exists idx_local_shop_gb_author
  on public.local_shop_guestbook_entries (author_id);

comment on table public.local_shop_guestbook_entries is
  '로컬 가게 미니홈 방명록. 공개 가게에 로그인 회원만 INSERT. 오너는 숨김/삭제.';

alter table public.local_shop_guestbook_entries enable row level security;

-- 읽기: 가게가 공개이거나 열람자가 오너인 경우, 행은 비공개 숨김이면 오너·작성자만
drop policy if exists local_shop_gb_select on public.local_shop_guestbook_entries;
create policy local_shop_gb_select on public.local_shop_guestbook_entries
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_shop_guestbook_entries.local_spot_id
        and (s.is_published = true or s.owner_profile_id = auth.uid())
    )
    and (
      is_hidden = false
      or exists (
        select 1 from public.local_spots s2
        where s2.id = local_shop_guestbook_entries.local_spot_id
          and s2.owner_profile_id = auth.uid()
      )
      or author_id = auth.uid()
    )
  );

-- 작성: 공개 가게만, 본인 명의
drop policy if exists local_shop_gb_insert on public.local_shop_guestbook_entries;
create policy local_shop_gb_insert on public.local_shop_guestbook_entries
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id and s.is_published = true
    )
  );

-- 오너: 숨김 토글만 (본문·작성자 불변)
create or replace function public.local_shop_guestbook_owner_update_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if auth.uid() is null then
    return new;
  end if;
  if not exists (
    select 1 from public.local_spots s
    where s.id = new.local_spot_id and s.owner_profile_id = auth.uid()
  ) then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.local_spot_id is distinct from old.local_spot_id
     or new.author_id is distinct from old.author_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at
  then
    raise exception 'LOCAL_SHOP_GB_OWNER_HIDE_ONLY' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_local_shop_gb_owner_guard on public.local_shop_guestbook_entries;
create trigger trg_local_shop_gb_owner_guard
  before update on public.local_shop_guestbook_entries
  for each row
  execute function public.local_shop_guestbook_owner_update_guard();

drop policy if exists local_shop_gb_update_owner on public.local_shop_guestbook_entries;
create policy local_shop_gb_update_owner on public.local_shop_guestbook_entries
  for update to authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id and s.owner_profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id and s.owner_profile_id = auth.uid()
    )
  );

drop policy if exists local_shop_gb_delete_owner on public.local_shop_guestbook_entries;
create policy local_shop_gb_delete_owner on public.local_shop_guestbook_entries
  for delete to authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id and s.owner_profile_id = auth.uid()
    )
  );

grant select on table public.local_shop_guestbook_entries to anon, authenticated;
grant insert, update, delete on table public.local_shop_guestbook_entries to authenticated;

-- -----------------------------------------------------------------------------
-- 오너가 갤러리(photo_urls)도 편집 가능하도록 기존 트리거 완화
-- -----------------------------------------------------------------------------
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
     or new.category is distinct from old.category
     or new.tags is distinct from old.tags
     or new.sort_order is distinct from old.sort_order
     or new.is_published is distinct from old.is_published
     or new.extra is distinct from old.extra
     or new.minihome_public_slug is distinct from old.minihome_public_slug
  then
    raise exception 'LOCAL_SPOT_OWNER_MINIHOME_ONLY: 소유자는 미니홈 콘텐츠·갤러리(photo_urls)만 수정할 수 있습니다'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.local_spots_restrict_owner_update() is
  'local_spots: 오너는 minihome_* 필드 및 photo_urls 만 변경 가능.';
