-- =============================================================================
-- 081_minihome_section_visibility_rls.sql
-- Align Minihome RLS with section_visibility settings
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Guestbook: enforce section_visibility('guestbook')
-- -----------------------------------------------------------------------------
drop policy if exists minihome_guestbook_select on public.minihome_guestbook_entries;
create policy minihome_guestbook_select on public.minihome_guestbook_entries
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.user_minihomes h
      where h.owner_id = minihome_guestbook_entries.minihome_owner_id
        and (
          auth.uid() = h.owner_id
          or (
            h.is_public = true
            and (
              coalesce(h.section_visibility->>'guestbook', 'public') = 'public'
              or (
                coalesce(h.section_visibility->>'guestbook', 'public') = 'ilchon'
                and auth.uid() is not null
                and exists (
                  select 1
                  from public.ilchon_links l
                  where l.user_id = auth.uid()
                    and l.peer_id = h.owner_id
                )
              )
            )
          )
        )
    )
    and (
      is_hidden = false
      or auth.uid() = minihome_owner_id
      or auth.uid() = author_id
    )
  );

drop policy if exists minihome_guestbook_insert_open on public.minihome_guestbook_entries;
create policy minihome_guestbook_insert_open on public.minihome_guestbook_entries
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and entry_kind = 'open'
    and exists (
      select 1
      from public.user_minihomes h
      where h.owner_id = minihome_guestbook_entries.minihome_owner_id
        and (
          auth.uid() = h.owner_id
          or (
            h.is_public = true
            and coalesce(h.section_visibility->>'guestbook', 'public') = 'public'
          )
        )
    )
  );

drop policy if exists minihome_guestbook_insert_ilchon on public.minihome_guestbook_entries;
create policy minihome_guestbook_insert_ilchon on public.minihome_guestbook_entries
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and entry_kind = 'ilchon'
    and exists (
      select 1
      from public.user_minihomes h
      where h.owner_id = minihome_guestbook_entries.minihome_owner_id
        and (
          auth.uid() = h.owner_id
          or (
            h.is_public = true
            and coalesce(h.section_visibility->>'guestbook', 'public') in ('public', 'ilchon')
            and exists (
              select 1
              from public.ilchon_links l
              where l.user_id = auth.uid()
                and l.peer_id = h.owner_id
            )
          )
        )
    )
  );

-- -----------------------------------------------------------------------------
-- Photos: enforce section_visibility('photos')
-- -----------------------------------------------------------------------------
drop policy if exists minihome_albums_select on public.minihome_photo_albums;
create policy minihome_albums_select on public.minihome_photo_albums
  for select to anon, authenticated
  using (
    auth.uid() = owner_id
    or exists (
      select 1
      from public.user_minihomes h
      where h.owner_id = minihome_photo_albums.owner_id
        and h.is_public = true
        and (
          coalesce(h.section_visibility->>'photos', 'ilchon') = 'public'
          or (
            coalesce(h.section_visibility->>'photos', 'ilchon') = 'ilchon'
            and auth.uid() is not null
            and exists (
              select 1
              from public.ilchon_links l
              where l.user_id = auth.uid()
                and l.peer_id = h.owner_id
            )
          )
        )
    )
  );

drop policy if exists minihome_photos_select on public.minihome_photos;
create policy minihome_photos_select on public.minihome_photos
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.minihome_photo_albums a
      join public.user_minihomes h on h.owner_id = a.owner_id
      where a.id = minihome_photos.album_id
        and (
          auth.uid() = h.owner_id
          or (
            h.is_public = true
            and (
              coalesce(h.section_visibility->>'photos', 'ilchon') = 'public'
              or (
                coalesce(h.section_visibility->>'photos', 'ilchon') = 'ilchon'
                and auth.uid() is not null
                and exists (
                  select 1
                  from public.ilchon_links l
                  where l.user_id = auth.uid()
                    and l.peer_id = h.owner_id
                )
              )
            )
          )
        )
    )
  );

-- Move storage bucket to private mode, enforce access by RLS
update storage.buckets
set public = false
where id = 'minihome-photos';

drop policy if exists minihome_photos_storage_select on storage.objects;
create policy minihome_photos_storage_select on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'minihome-photos'
    and exists (
      select 1
      from public.user_minihomes h
      where h.owner_id::text = split_part(storage.objects.name, '/', 1)
        and (
          auth.uid() = h.owner_id
          or (
            h.is_public = true
            and (
              coalesce(h.section_visibility->>'photos', 'ilchon') = 'public'
              or (
                coalesce(h.section_visibility->>'photos', 'ilchon') = 'ilchon'
                and auth.uid() is not null
                and exists (
                  select 1
                  from public.ilchon_links l
                  where l.user_id = auth.uid()
                    and l.peer_id = h.owner_id
                )
              )
            )
          )
        )
    )
  );

-- -----------------------------------------------------------------------------
-- Diary: enforce section_visibility('diary') and secret flag
-- -----------------------------------------------------------------------------
drop policy if exists diary_select_public on public.minihome_diary_entries;
drop policy if exists diary_select_visible on public.minihome_diary_entries;
drop policy if exists diary_select_own on public.minihome_diary_entries;

create policy diary_select_own on public.minihome_diary_entries
  for select
  using (owner_id = auth.uid());

create policy diary_select_visible on public.minihome_diary_entries
  for select to anon, authenticated
  using (
    is_secret = false
    and exists (
      select 1
      from public.user_minihomes h
      where h.owner_id = minihome_diary_entries.owner_id
        and h.is_public = true
        and (
          coalesce(h.section_visibility->>'diary', 'ilchon') = 'public'
          or (
            coalesce(h.section_visibility->>'diary', 'ilchon') = 'ilchon'
            and auth.uid() is not null
            and exists (
              select 1
              from public.ilchon_links l
              where l.user_id = auth.uid()
                and l.peer_id = h.owner_id
            )
          )
        )
    )
  );
