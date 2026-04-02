-- =============================================================================
-- 053_minihome_cyworld_guestbook_photos.sql
-- 싸이 스타일 미니홈 2차: 일촌평(entry_kind=ilchon) / 방명록(open) 분리, 사진첩 업로드
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 방명록: 일촌평 vs 방명록 구분
-- -----------------------------------------------------------------------------
alter table public.minihome_guestbook_entries
  add column if not exists entry_kind text not null default 'open'
    check (entry_kind in ('open', 'ilchon'));

comment on column public.minihome_guestbook_entries.entry_kind is
  'open=누구나(로그인) 방명록, ilchon=일촌 관계만 일촌평.';

-- 기존 글: 본인 미니홈에 본인이 쓴 글(가입 인사 등)은 일촌평 창에 보이도록
update public.minihome_guestbook_entries
set entry_kind = 'ilchon'
where author_id = minihome_owner_id;

-- 읽기 정책 교체: 숨김 글은 작성자·미니홈 주인만
drop policy if exists minihome_guestbook_select on public.minihome_guestbook_entries;
create policy minihome_guestbook_select on public.minihome_guestbook_entries
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.user_minihomes h
      where h.owner_id = minihome_guestbook_entries.minihome_owner_id
        and (h.is_public = true or auth.uid() = h.owner_id)
    )
    and (
      is_hidden = false
      or auth.uid() = minihome_owner_id
      or auth.uid() = author_id
    )
  );

-- 방명록: 공개 미니홈에 로그인 이용자 누구나(본인 미니홈 포함)
drop policy if exists minihome_guestbook_insert_open on public.minihome_guestbook_entries;
create policy minihome_guestbook_insert_open on public.minihome_guestbook_entries
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and entry_kind = 'open'
    and exists (
      select 1 from public.user_minihomes h
      where h.owner_id = minihome_guestbook_entries.minihome_owner_id
        and (h.is_public = true or auth.uid() = h.owner_id)
    )
  );

-- 일촌평: 일촌 맺은 상대만 (또는 본인 미니홈 주인 본인)
drop policy if exists minihome_guestbook_insert_ilchon on public.minihome_guestbook_entries;
create policy minihome_guestbook_insert_ilchon on public.minihome_guestbook_entries
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and entry_kind = 'ilchon'
    and exists (
      select 1 from public.user_minihomes h
      where h.owner_id = minihome_guestbook_entries.minihome_owner_id
        and (h.is_public = true or auth.uid() = h.owner_id)
    )
    and (
      auth.uid() = minihome_guestbook_entries.minihome_owner_id
      or exists (
        select 1 from public.ilchon_links l
        where l.user_id = auth.uid()
          and l.peer_id = minihome_guestbook_entries.minihome_owner_id
      )
    )
  );

create or replace function public.minihome_guestbook_owner_moderation_guard()
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
  if auth.uid() <> old.minihome_owner_id then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.minihome_owner_id is distinct from old.minihome_owner_id
     or new.author_id is distinct from old.author_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at
     or new.entry_kind is distinct from old.entry_kind
  then
    raise exception 'MINIHOME_GB_OWNER_MODERATION_ONLY' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_minihome_gb_owner_mod on public.minihome_guestbook_entries;
create trigger trg_minihome_gb_owner_mod
  before update on public.minihome_guestbook_entries
  for each row
  execute function public.minihome_guestbook_owner_moderation_guard();

drop policy if exists minihome_guestbook_update_owner on public.minihome_guestbook_entries;
create policy minihome_guestbook_update_owner on public.minihome_guestbook_entries
  for update to authenticated
  using (auth.uid() = minihome_owner_id)
  with check (auth.uid() = minihome_owner_id);

drop policy if exists minihome_guestbook_delete_owner on public.minihome_guestbook_entries;
create policy minihome_guestbook_delete_owner on public.minihome_guestbook_entries
  for delete to authenticated
  using (auth.uid() = minihome_owner_id);

grant insert, update, delete on table public.minihome_guestbook_entries to authenticated;

-- -----------------------------------------------------------------------------
-- 가입 인사 RPC: 일촌평 종류로 기록
-- -----------------------------------------------------------------------------
create or replace function public.style_complete_signup_greeting(p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b text := trim(p_body);
  bonus int := 150;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if exists (select 1 from public.profiles p where p.id = uid and p.signup_greeting_done) then
    raise exception 'GREETING_ALREADY_DONE';
  end if;

  if b is null or char_length(b) < 4 then
    raise exception 'GREETING_BODY_TOO_SHORT';
  end if;
  if char_length(b) > 2000 then
    raise exception 'GREETING_BODY_TOO_LONG';
  end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  insert into public.minihome_guestbook_entries (minihome_owner_id, author_id, body, entry_kind)
  values (uid, uid, b, 'ilchon');

  update public.profiles
  set
    style_score_total = style_score_total + bonus,
    signup_greeting_done = true
  where id = uid;

  return jsonb_build_object('ok', true, 'points_granted', bonus);
end;
$$;

-- -----------------------------------------------------------------------------
-- 사진첩: 앨범·사진 쓰기 (소유자만) + 스토리지 버킷
-- -----------------------------------------------------------------------------
drop policy if exists minihome_albums_insert_own on public.minihome_photo_albums;
create policy minihome_albums_insert_own on public.minihome_photo_albums
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists minihome_albums_update_own on public.minihome_photo_albums;
create policy minihome_albums_update_own on public.minihome_photo_albums
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists minihome_albums_delete_own on public.minihome_photo_albums;
create policy minihome_albums_delete_own on public.minihome_photo_albums
  for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists minihome_photos_insert_own on public.minihome_photos;
create policy minihome_photos_insert_own on public.minihome_photos
  for insert to authenticated
  with check (
    exists (
      select 1 from public.minihome_photo_albums a
      where a.id = album_id and a.owner_id = auth.uid()
    )
  );

drop policy if exists minihome_photos_update_own on public.minihome_photos;
create policy minihome_photos_update_own on public.minihome_photos
  for update to authenticated
  using (
    exists (
      select 1 from public.minihome_photo_albums a
      where a.id = album_id and a.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.minihome_photo_albums a
      where a.id = album_id and a.owner_id = auth.uid()
    )
  );

drop policy if exists minihome_photos_delete_own on public.minihome_photos;
create policy minihome_photos_delete_own on public.minihome_photos
  for delete to authenticated
  using (
    exists (
      select 1 from public.minihome_photo_albums a
      where a.id = album_id and a.owner_id = auth.uid()
    )
  );

grant insert, update, delete on table public.minihome_photo_albums to authenticated;
grant insert, update, delete on table public.minihome_photos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'minihome-photos',
  'minihome-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists minihome_photos_storage_select on storage.objects;
create policy minihome_photos_storage_select on storage.objects
  for select
  using (bucket_id = 'minihome-photos');

drop policy if exists minihome_photos_storage_insert on storage.objects;
create policy minihome_photos_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'minihome-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists minihome_photos_storage_update on storage.objects;
create policy minihome_photos_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'minihome-photos' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'minihome-photos' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists minihome_photos_storage_delete on storage.objects;
create policy minihome_photos_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'minihome-photos' and split_part(name, '/', 1) = auth.uid()::text);
