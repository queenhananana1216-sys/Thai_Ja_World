-- 게시글 이미지 URL 배열 + 공개 스토리지 버킷 (1차 출시)
-- Supabase SQL Editor 또는 migration으로 실행

alter table public.posts
  add column if not exists image_urls text[] not null default '{}';

-- Storage (이미 있으면 스킵)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "post_images_select_public" on storage.objects;
create policy "post_images_select_public"
  on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists "post_images_insert_authenticated" on storage.objects;
create policy "post_images_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images');

drop policy if exists "post_images_update_own" on storage.objects;
create policy "post_images_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'post-images' and owner = auth.uid());

drop policy if exists "post_images_delete_own" on storage.objects;
create policy "post_images_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and owner = auth.uid());
