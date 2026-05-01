-- 한인 업소 레이더(Biz Radar): 마트·약국·병원 공개 목록 + 크론 동기화(서비스 롤)
-- PostgREST 스키마 캐시: NOTIFY pgrst, 'reload_schema';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'korean_biz_category') then
    create type public.korean_biz_category as enum ('mart', 'pharmacy', 'hospital');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'korean_biz_region') then
    create type public.korean_biz_region as enum ('bangkok', 'pattaya', 'chiangmai');
  end if;
end$$;

create table if not exists public.korean_businesses (
  id uuid primary key default gen_random_uuid(),
  google_place_id text not null unique,
  name text not null,
  category public.korean_biz_category not null,
  region public.korean_biz_region not null,
  address text,
  phone text,
  latitude double precision,
  longitude double precision,
  is_verified boolean not null default true,
  last_verified_at timestamptz
);

comment on table public.korean_businesses is '방콕·파타야·치앙마이 한인 마트/약국/병원 — Places 크론 동기화, 공개 SELECT';

create index if not exists korean_businesses_region_category_idx
  on public.korean_businesses (region, category);

create index if not exists korean_businesses_last_verified_idx
  on public.korean_businesses (last_verified_at desc nulls last);

alter table public.korean_businesses enable row level security;

drop policy if exists "korean_businesses_select_public" on public.korean_businesses;
create policy "korean_businesses_select_public"
  on public.korean_businesses
  for select
  to anon, authenticated
  using (true);

drop policy if exists "korean_businesses_no_insert" on public.korean_businesses;
create policy "korean_businesses_no_insert"
  on public.korean_businesses
  for insert
  to anon, authenticated
  with check (false);

drop policy if exists "korean_businesses_no_update" on public.korean_businesses;
create policy "korean_businesses_no_update"
  on public.korean_businesses
  for update
  to anon, authenticated
  using (false);

drop policy if exists "korean_businesses_no_delete" on public.korean_businesses;
create policy "korean_businesses_no_delete"
  on public.korean_businesses
  for delete
  to anon, authenticated
  using (false);

grant select on public.korean_businesses to anon, authenticated;

notify pgrst, 'reload_schema';
