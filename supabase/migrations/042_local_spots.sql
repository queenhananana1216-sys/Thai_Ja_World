-- ============================================================
-- 042_local_spots.sql
-- 태자월드 로컬 가게(맛집 등) — 사진 URL·설명·LINE 링크, 확장 필드 extra(jsonb)
-- ============================================================

create table if not exists public.local_spots (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  line_url    text,
  photo_urls  jsonb not null default '[]'::jsonb,
  category    text not null default 'restaurant'
    check (category in ('restaurant', 'cafe', 'night_market', 'service', 'shopping', 'other')),
  tags        text[] not null default '{}',
  sort_order  int not null default 0,
  is_published boolean not null default false,
  extra       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.local_spots is '운영자 등록 로컬 가게/맛집. photo_urls 는 공개 이미지 URL 배열(JSON 문자열). extra 에 전화/주소/지도 등 확장.';
comment on column public.local_spots.extra is '스키마 없이 확장: { "phone": "...", "address": "...", "maps_url": "..." } 등';
comment on column public.local_spots.photo_urls is '["https://.../a.jpg", ...] 형태 JSON 배열';

create index if not exists local_spots_published_sort_idx
  on public.local_spots (is_published, sort_order asc, created_at desc);

drop trigger if exists trg_local_spots_updated_at on public.local_spots;
create trigger trg_local_spots_updated_at
  before update on public.local_spots
  for each row execute function public.set_updated_at();

alter table public.local_spots enable row level security;

drop policy if exists local_spots_select_published on public.local_spots;
create policy local_spots_select_published
  on public.local_spots for select
  to anon, authenticated
  using (is_published = true);

-- 쓰기는 service_role 전용(관리자 API). 일반 클라이언트는 insert/update 없음.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'local-spots',
  'local-spots',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists local_spots_storage_select on storage.objects;
create policy local_spots_storage_select
  on storage.objects for select
  using (bucket_id = 'local-spots');

drop policy if exists local_spots_storage_insert_auth on storage.objects;
create policy local_spots_storage_insert_auth
  on storage.objects for insert to authenticated
  with check (bucket_id = 'local-spots');

drop policy if exists local_spots_storage_update_own on storage.objects;
create policy local_spots_storage_update_own
  on storage.objects for update to authenticated
  using (bucket_id = 'local-spots' and owner = auth.uid());

drop policy if exists local_spots_storage_delete_own on storage.objects;
create policy local_spots_storage_delete_own
  on storage.objects for delete to authenticated
  using (bucket_id = 'local-spots' and owner = auth.uid());
