-- =============================================================================
-- 054_local_shop_guestbook_toggle_ilchon.sql
-- 가게 미니홈: 방명록 on/off(오너·관리자) + entry_kind(open | ilchon) + RLS
-- =============================================================================

alter table public.local_spots
  add column if not exists minihome_guestbook_enabled boolean not null default true;

comment on column public.local_spots.minihome_guestbook_enabled is
  '가게 방명록·일촌평 수신. false면 비오너는 목록 조회·작성 불가(RLS).';

alter table public.local_shop_guestbook_entries
  add column if not exists entry_kind text not null default 'open';

alter table public.local_shop_guestbook_entries
  drop constraint if exists local_shop_gb_entry_kind_check;

alter table public.local_shop_guestbook_entries
  add constraint local_shop_gb_entry_kind_check
  check (entry_kind in ('open', 'ilchon'));

comment on column public.local_shop_guestbook_entries.entry_kind is
  'open=일반 방명록(로그인 이용자), ilchon=가게 오너와 일촌인 이용자만 작성.';

-- ---------------------------------------------------------------------------
-- RLS: SELECT — 가게 열람 가능 + (방명록 켜짐 이거나 열람자가 오너)
-- ---------------------------------------------------------------------------
drop policy if exists local_shop_gb_select on public.local_shop_guestbook_entries;
create policy local_shop_gb_select on public.local_shop_guestbook_entries
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_shop_guestbook_entries.local_spot_id
        and (s.is_published = true or s.owner_profile_id is not distinct from auth.uid())
        and (
          s.minihome_guestbook_enabled = true
          or s.owner_profile_id is not distinct from auth.uid()
        )
    )
    and (
      is_hidden = false
      or exists (
        select 1 from public.local_spots s2
        where s2.id = local_shop_guestbook_entries.local_spot_id
          and s2.owner_profile_id is not distinct from auth.uid()
      )
      or author_id is not distinct from auth.uid()
    )
  );

-- INSERT: 일반 방명록
drop policy if exists local_shop_gb_insert on public.local_shop_guestbook_entries;
drop policy if exists local_shop_gb_insert_open on public.local_shop_guestbook_entries;
create policy local_shop_gb_insert_open on public.local_shop_guestbook_entries
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and entry_kind = 'open'
    and exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id
        and s.is_published = true
        and s.minihome_guestbook_enabled = true
    )
  );

-- INSERT: 일촌평 (가게 owner_profile_id 와 일촌 링크)
drop policy if exists local_shop_gb_insert_ilchon on public.local_shop_guestbook_entries;
create policy local_shop_gb_insert_ilchon on public.local_shop_guestbook_entries
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and entry_kind = 'ilchon'
    and exists (
      select 1
      from public.local_spots s
      inner join public.ilchon_links il
        on il.user_id = auth.uid()
       and il.peer_id = s.owner_profile_id
      where s.id = local_spot_id
        and s.is_published = true
        and s.minihome_guestbook_enabled = true
        and s.owner_profile_id is not null
    )
  );

-- 오너 UPDATE 가드: entry_kind 변경 불가
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
    where s.id = new.local_spot_id and s.owner_profile_id is not distinct from auth.uid()
  ) then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.local_spot_id is distinct from old.local_spot_id
     or new.author_id is distinct from old.author_id
     or new.body is distinct from old.body
     or new.entry_kind is distinct from old.entry_kind
     or new.created_at is distinct from old.created_at
  then
    raise exception 'LOCAL_SHOP_GB_OWNER_HIDE_ONLY' using errcode = '42501';
  end if;
  return new;
end;
$$;
