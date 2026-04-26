-- =============================================================================
-- 077_ilchon_dm_presence_local_publish.sql
-- - 로컬 가게 오너: 공개/비공개(is_published) 직접 토글 허용
-- - 일촌 검색: 닉네임(display_name) 기반 검색 RPC
-- - 일촌 DM + 접속 상태 + 오프라인 시 notifications 적재
-- =============================================================================

-- -----------------------------------------------------------------------------
-- local_spots owner guard: 공개/비공개 토글 허용
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
     or new.photo_urls is distinct from old.photo_urls
     or new.category is distinct from old.category
     or new.tags is distinct from old.tags
     or new.sort_order is distinct from old.sort_order
     or new.extra is distinct from old.extra
     or new.minihome_public_slug is distinct from old.minihome_public_slug
  then
    raise exception 'LOCAL_SPOT_OWNER_MINIHOME_ONLY: 소유자는 미니홈 콘텐츠(소개·테마·BGM·메뉴·레이아웃·minihome_extra)와 공개 상태만 수정할 수 있습니다';
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 닉네임 기반 일촌 검색 (이메일 불필요)
-- -----------------------------------------------------------------------------
create or replace function public.ilchon_search_users(
  p_query text,
  p_limit int default 8
) returns table (
  user_id uuid,
  display_name text,
  public_slug text,
  is_ilchon boolean,
  pending_outbound boolean,
  pending_inbound boolean,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q text := lower(trim(coalesce(p_query, '')));
  v_limit int := greatest(1, least(coalesce(p_limit, 8), 20));
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(v_q) < 1 then
    return;
  end if;

  return query
  with base as (
    select
      p.id,
      p.display_name,
      p.last_seen_at,
      m.public_slug
    from public.profiles p
    left join public.user_minihomes m on m.owner_id = p.id and m.is_public = true
    where p.id <> v_uid
      and lower(coalesce(p.display_name, '')) like '%' || v_q || '%'
    order by p.last_seen_at desc nulls last, p.created_at desc
    limit v_limit
  )
  select
    b.id as user_id,
    coalesce(nullif(trim(b.display_name), ''), 'member') as display_name,
    b.public_slug,
    exists (
      select 1 from public.ilchon_links l
      where l.user_id = v_uid and l.peer_id = b.id
    ) as is_ilchon,
    exists (
      select 1 from public.ilchon_requests r
      where r.status = 'pending' and r.from_user_id = v_uid and r.to_user_id = b.id
    ) as pending_outbound,
    exists (
      select 1 from public.ilchon_requests r
      where r.status = 'pending' and r.from_user_id = b.id and r.to_user_id = v_uid
    ) as pending_inbound,
    b.last_seen_at
  from base b;
end;
$$;

alter function public.ilchon_search_users(text, int) owner to postgres;
revoke all on function public.ilchon_search_users(text, int) from public;
grant execute on function public.ilchon_search_users(text, int) to authenticated;

-- -----------------------------------------------------------------------------
-- 일촌 접속 상태 (DM 창 활성 peer 포함)
-- -----------------------------------------------------------------------------
create table if not exists public.ilchon_presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  active_peer_id uuid references public.profiles (id) on delete set null,
  is_online boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.ilchon_presence enable row level security;

drop policy if exists ilchon_presence_select on public.ilchon_presence;
create policy ilchon_presence_select on public.ilchon_presence
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.ilchon_links l
      where l.user_id = auth.uid() and l.peer_id = ilchon_presence.user_id
    )
  );

drop policy if exists ilchon_presence_insert_own on public.ilchon_presence;
create policy ilchon_presence_insert_own on public.ilchon_presence
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists ilchon_presence_update_own on public.ilchon_presence;
create policy ilchon_presence_update_own on public.ilchon_presence
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on table public.ilchon_presence to authenticated;

create or replace function public.ilchon_set_presence(
  p_active_peer_id uuid default null,
  p_is_online boolean default true
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_active_peer_id is not null and not exists (
    select 1 from public.ilchon_links l
    where l.user_id = v_uid and l.peer_id = p_active_peer_id
  ) then
    raise exception 'not_ilchon_peer';
  end if;

  insert into public.ilchon_presence (user_id, active_peer_id, is_online, updated_at)
  values (v_uid, p_active_peer_id, coalesce(p_is_online, true), now())
  on conflict (user_id) do update
  set active_peer_id = excluded.active_peer_id,
      is_online = excluded.is_online,
      updated_at = now();
end;
$$;

alter function public.ilchon_set_presence(uuid, boolean) owner to postgres;
revoke all on function public.ilchon_set_presence(uuid, boolean) from public;
grant execute on function public.ilchon_set_presence(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 일촌 DM + 오프라인 알림
-- -----------------------------------------------------------------------------
create table if not exists public.ilchon_dm_messages (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint ilchon_dm_no_self check (from_user_id <> to_user_id),
  constraint ilchon_dm_body_len check (char_length(body) between 1 and 1000)
);

create index if not exists idx_ilchon_dm_to_unread
  on public.ilchon_dm_messages (to_user_id, is_read, created_at desc);

create index if not exists idx_ilchon_dm_pair_created
  on public.ilchon_dm_messages (from_user_id, to_user_id, created_at desc);

alter table public.ilchon_dm_messages enable row level security;

drop policy if exists ilchon_dm_select_participants on public.ilchon_dm_messages;
create policy ilchon_dm_select_participants on public.ilchon_dm_messages
  for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists ilchon_dm_insert_sender on public.ilchon_dm_messages;
create policy ilchon_dm_insert_sender on public.ilchon_dm_messages
  for insert to authenticated
  with check (
    from_user_id = auth.uid()
    and exists (
      select 1 from public.ilchon_links l
      where l.user_id = auth.uid() and l.peer_id = to_user_id
    )
  );

drop policy if exists ilchon_dm_update_recipient on public.ilchon_dm_messages;
create policy ilchon_dm_update_recipient on public.ilchon_dm_messages
  for update to authenticated
  using (to_user_id = auth.uid())
  with check (to_user_id = auth.uid());

grant select, insert, update on table public.ilchon_dm_messages to authenticated;

create or replace function public.ilchon_send_dm(
  p_to_user_id uuid,
  p_body text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from uuid := auth.uid();
  v_body text := trim(coalesce(p_body, ''));
  v_id uuid;
  v_sender_name text;
  v_should_notify boolean := true;
begin
  if v_from is null then
    raise exception 'not_authenticated';
  end if;
  if p_to_user_id is null or p_to_user_id = v_from then
    raise exception 'invalid_recipient';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 1000 then
    raise exception 'invalid_body';
  end if;
  if not exists (
    select 1 from public.ilchon_links l
    where l.user_id = v_from and l.peer_id = p_to_user_id
  ) then
    raise exception 'not_ilchon';
  end if;

  insert into public.ilchon_dm_messages (from_user_id, to_user_id, body)
  values (v_from, p_to_user_id, v_body)
  returning id into v_id;

  if exists (
    select 1 from public.ilchon_presence p
    where p.user_id = p_to_user_id
      and p.is_online = true
      and p.active_peer_id = v_from
      and p.updated_at > now() - interval '90 seconds'
  ) then
    v_should_notify := false;
  end if;

  if v_should_notify then
    select coalesce(nullif(trim(display_name), ''), 'member')
      into v_sender_name
    from public.profiles
    where id = v_from;

    insert into public.notifications (user_id, source_type, source_id, title, body, href)
    values (
      p_to_user_id,
      'ilchon_dm',
      v_id,
      coalesce(v_sender_name, 'member') || ' 님의 새 쪽지',
      left(v_body, 180),
      '/ilchon?peer=' || v_from::text
    );
  end if;

  return v_id;
end;
$$;

alter function public.ilchon_send_dm(uuid, text) owner to postgres;
revoke all on function public.ilchon_send_dm(uuid, text) from public;
grant execute on function public.ilchon_send_dm(uuid, text) to authenticated;

