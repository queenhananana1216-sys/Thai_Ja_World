-- korean_businesses: 원격/로컬 스키마 드리프트 시 anon·authenticated 읽기 실패 보정
-- PostgREST: NOTIFY pgrst, 'reload_schema';

alter table if exists public.korean_businesses enable row level security;

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

grant usage on schema public to anon, authenticated;
grant select on table public.korean_businesses to anon, authenticated;

notify pgrst, 'reload_schema';
