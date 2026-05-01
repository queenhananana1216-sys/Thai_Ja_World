-- 태자월드 공개 UI 플래그 (anon 읽기 · 쓰기는 서비스 롤 API만)
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is '사이트 전역 UI·동작 플래그 — 공개 SELECT, 변경은 관리자 API(service role)';

create index if not exists site_settings_updated_at_idx on public.site_settings (updated_at desc);

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_select_public" on public.site_settings;
create policy "site_settings_select_public"
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

-- 직접 쓰기 없음(서비스 롤은 RLS 우회)
drop policy if exists "site_settings_no_insert" on public.site_settings;
create policy "site_settings_no_insert"
  on public.site_settings
  for insert
  to anon, authenticated
  with check (false);

drop policy if exists "site_settings_no_update" on public.site_settings;
create policy "site_settings_no_update"
  on public.site_settings
  for update
  to anon, authenticated
  using (false);

drop policy if exists "site_settings_no_delete" on public.site_settings;
create policy "site_settings_no_delete"
  on public.site_settings
  for delete
  to anon, authenticated
  using (false);

grant select on public.site_settings to anon, authenticated;

insert into public.site_settings (key, value)
values
  ('ui.text_scale', '"normal"'::jsonb),
  ('ui.hide_ai_chrome', 'false'::jsonb),
  ('ui.weather_widget_enabled', 'true'::jsonb)
on conflict (key) do nothing;
