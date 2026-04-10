-- =============================================================================
-- 067_taejaworld_owner_tools_chat_notifications.sql
-- - my-local-shop: events / announcements / owner comment replies / photo ops
-- - member surface: in-app notifications center + simple realtime chat
-- =============================================================================

-- -----------------------------------------------------------------------------
-- local_shop_guestbook_entries: owner reply fields
-- -----------------------------------------------------------------------------
alter table public.local_shop_guestbook_entries
  add column if not exists owner_reply text,
  add column if not exists owner_reply_at timestamptz;

alter table public.local_shop_guestbook_entries
  drop constraint if exists local_shop_gb_owner_reply_len;

alter table public.local_shop_guestbook_entries
  add constraint local_shop_gb_owner_reply_len
  check (owner_reply is null or (char_length(owner_reply) >= 1 and char_length(owner_reply) <= 800));

comment on column public.local_shop_guestbook_entries.owner_reply is
  '가게 오너 답글. null이면 미답글.';

comment on column public.local_shop_guestbook_entries.owner_reply_at is
  '가게 오너 답글 수정 시각.';

-- -----------------------------------------------------------------------------
-- local_spot_events: owner event/calendar cards
-- -----------------------------------------------------------------------------
create table if not exists public.local_spot_events (
  id uuid primary key default gen_random_uuid(),
  local_spot_id uuid not null references public.local_spots (id) on delete cascade,
  title text not null,
  body text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint local_spot_events_title_len check (char_length(title) between 1 and 120),
  constraint local_spot_events_body_len check (body is null or char_length(body) <= 2000),
  constraint local_spot_events_period check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index if not exists idx_local_spot_events_spot_start
  on public.local_spot_events (local_spot_id, starts_at desc nulls last, created_at desc);

drop trigger if exists trg_local_spot_events_updated_at on public.local_spot_events;
create trigger trg_local_spot_events_updated_at
  before update on public.local_spot_events
  for each row execute function public.set_updated_at();

alter table public.local_spot_events enable row level security;

drop policy if exists local_spot_events_select on public.local_spot_events;
create policy local_spot_events_select on public.local_spot_events
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = local_spot_events.local_spot_id
        and (
          (s.is_published = true and local_spot_events.is_published = true)
          or s.owner_profile_id is not distinct from auth.uid()
        )
    )
  );

drop policy if exists local_spot_events_insert_owner on public.local_spot_events;
create policy local_spot_events_insert_owner on public.local_spot_events
  for insert to authenticated
  with check (
    exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

drop policy if exists local_spot_events_update_owner on public.local_spot_events;
create policy local_spot_events_update_owner on public.local_spot_events
  for update to authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

drop policy if exists local_spot_events_delete_owner on public.local_spot_events;
create policy local_spot_events_delete_owner on public.local_spot_events
  for delete to authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

grant select on table public.local_spot_events to anon, authenticated;
grant insert, update, delete on table public.local_spot_events to authenticated;

-- -----------------------------------------------------------------------------
-- local_spot_announcements: owner notices + trigger into notifications
-- -----------------------------------------------------------------------------
create table if not exists public.local_spot_announcements (
  id uuid primary key default gen_random_uuid(),
  local_spot_id uuid not null references public.local_spots (id) on delete cascade,
  kind text not null default 'notice',
  title text not null,
  body text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint local_spot_ann_kind_check check (kind in ('notice', 'special_menu', 'hours', 'other')),
  constraint local_spot_ann_title_len check (char_length(title) between 1 and 120),
  constraint local_spot_ann_body_len check (char_length(body) between 1 and 3000)
);

create index if not exists idx_local_spot_announcements_spot_created
  on public.local_spot_announcements (local_spot_id, created_at desc);

drop trigger if exists trg_local_spot_announcements_updated_at on public.local_spot_announcements;
create trigger trg_local_spot_announcements_updated_at
  before update on public.local_spot_announcements
  for each row execute function public.set_updated_at();

alter table public.local_spot_announcements enable row level security;

drop policy if exists local_spot_announcements_select on public.local_spot_announcements;
create policy local_spot_announcements_select on public.local_spot_announcements
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = local_spot_announcements.local_spot_id
        and (
          (s.is_published = true and local_spot_announcements.is_published = true)
          or s.owner_profile_id is not distinct from auth.uid()
        )
    )
  );

drop policy if exists local_spot_announcements_insert_owner on public.local_spot_announcements;
create policy local_spot_announcements_insert_owner on public.local_spot_announcements
  for insert to authenticated
  with check (
    exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

drop policy if exists local_spot_announcements_update_owner on public.local_spot_announcements;
create policy local_spot_announcements_update_owner on public.local_spot_announcements
  for update to authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

drop policy if exists local_spot_announcements_delete_owner on public.local_spot_announcements;
create policy local_spot_announcements_delete_owner on public.local_spot_announcements
  for delete to authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

grant select on table public.local_spot_announcements to anon, authenticated;
grant insert, update, delete on table public.local_spot_announcements to authenticated;

-- -----------------------------------------------------------------------------
-- notifications: in-app inbox
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null default 'system',
  source_id uuid,
  title text not null,
  body text,
  href text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id is not distinct from auth.uid());

drop policy if exists notifications_insert_own on public.notifications;
create policy notifications_insert_own on public.notifications
  for insert to authenticated
  with check (user_id is not distinct from auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id is not distinct from auth.uid())
  with check (user_id is not distinct from auth.uid());

grant select, insert, update on table public.notifications to authenticated;

-- -----------------------------------------------------------------------------
-- chat rooms/messages: simple community chat
-- -----------------------------------------------------------------------------
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint chat_rooms_slug_len check (char_length(slug) between 2 and 40),
  constraint chat_rooms_slug_format check (slug ~ '^[a-z0-9][a-z0-9_-]{1,38}[a-z0-9]$')
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_messages_body_len check (char_length(body) between 1 and 1000)
);

create index if not exists idx_chat_messages_room_created
  on public.chat_messages (room_id, created_at desc);

create index if not exists idx_chat_messages_author_created
  on public.chat_messages (author_id, created_at desc);

drop trigger if exists trg_chat_messages_updated_at on public.chat_messages;
create trigger trg_chat_messages_updated_at
  before update on public.chat_messages
  for each row execute function public.set_updated_at();

insert into public.chat_rooms (slug, title, description, created_by, is_active)
values (
  'lobby',
  'Lobby',
  '태자월드 기본 채팅방',
  null,
  true
)
on conflict (slug) do nothing;

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists chat_rooms_select_active on public.chat_rooms;
create policy chat_rooms_select_active on public.chat_rooms
  for select to authenticated
  using (is_active = true);

drop policy if exists chat_rooms_insert_auth on public.chat_rooms;
create policy chat_rooms_insert_auth on public.chat_rooms
  for insert to authenticated
  with check (created_by is not distinct from auth.uid());

drop policy if exists chat_rooms_update_creator on public.chat_rooms;
create policy chat_rooms_update_creator on public.chat_rooms
  for update to authenticated
  using (created_by is not distinct from auth.uid())
  with check (created_by is not distinct from auth.uid());

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.chat_rooms r
      where r.id = chat_messages.room_id and r.is_active = true
    )
  );

drop policy if exists chat_messages_insert_own on public.chat_messages;
create policy chat_messages_insert_own on public.chat_messages
  for insert to authenticated
  with check (
    author_id is not distinct from auth.uid()
    and exists (
      select 1 from public.chat_rooms r
      where r.id = room_id and r.is_active = true
    )
  );

drop policy if exists chat_messages_update_own on public.chat_messages;
create policy chat_messages_update_own on public.chat_messages
  for update to authenticated
  using (author_id is not distinct from auth.uid())
  with check (author_id is not distinct from auth.uid());

grant select, insert, update on table public.chat_rooms to authenticated;
grant select, insert, update on table public.chat_messages to authenticated;

-- -----------------------------------------------------------------------------
-- Trigger: owner announcements -> notifications for ilchon links
-- -----------------------------------------------------------------------------
create or replace function public.notify_local_spot_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_uid uuid;
  spot_slug text;
  spot_name text;
  target_href text;
begin
  if new.is_published is distinct from true then
    return new;
  end if;

  select s.owner_profile_id, s.minihome_public_slug, s.name
  into owner_uid, spot_slug, spot_name
  from public.local_spots s
  where s.id = new.local_spot_id;

  if owner_uid is null then
    return new;
  end if;

  if spot_slug is not null and char_length(trim(spot_slug)) > 0 then
    target_href := '/shop/' || trim(spot_slug);
  else
    target_href := '/local';
  end if;

  insert into public.notifications (user_id, source_type, source_id, title, body, href)
  select
    il.user_id,
    'shop_announcement',
    new.id,
    coalesce(nullif(trim(new.title), ''), coalesce(spot_name, '가게') || ' 공지'),
    left(coalesce(new.body, ''), 280),
    target_href
  from public.ilchon_links il
  where il.peer_id = owner_uid;

  return new;
end;
$$;

drop trigger if exists trg_local_spot_announcement_notify on public.local_spot_announcements;
create trigger trg_local_spot_announcement_notify
  after insert on public.local_spot_announcements
  for each row
  execute function public.notify_local_spot_announcement();

alter function public.notify_local_spot_announcement() owner to postgres;
