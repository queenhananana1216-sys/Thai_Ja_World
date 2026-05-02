-- 로컬 미니홈 AI 확장: local_minihomes(스팟별 꾸미기 메타) + local_orders 방문 일정
-- 선행: decoration_assets(127_minihome_assets), local_spots, local_menus
-- PostgREST: NOTIFY pgrst, 'reload_schema';

create table if not exists public.local_minihomes (
  local_spot_id uuid primary key references public.local_spots (id) on delete cascade,
  decoration_skin_basic_id uuid references public.decoration_assets (id) on delete set null,
  decoration_skin_special_id uuid references public.decoration_assets (id) on delete set null,
  decoration_bgm_id uuid references public.decoration_assets (id) on delete set null,
  vibe_summary text,
  vibe_tags text[] not null default '{}'::text[],
  ai_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.local_minihomes is
  '로컬 스팟 1:1 미니홈 AI 메타(decoration_assets 연결·분위기 요약). 디스플레이용 테마는 local_spots.minihome_* 동기화.';

drop trigger if exists trg_local_minihomes_updated_at on public.local_minihomes;
create trigger trg_local_minihomes_updated_at
  before update on public.local_minihomes
  for each row execute function public.set_updated_at();

alter table public.local_minihomes enable row level security;

drop policy if exists local_minihomes_select_visible on public.local_minihomes;
create policy local_minihomes_select_visible
  on public.local_minihomes
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_minihomes.local_spot_id
        and (s.is_published = true or s.owner_profile_id is not distinct from auth.uid())
    )
  );

drop policy if exists local_minihomes_owner_insert on public.local_minihomes;
create policy local_minihomes_owner_insert
  on public.local_minihomes
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.local_spots s
      where s.id = local_minihomes.local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

drop policy if exists local_minihomes_owner_update on public.local_minihomes;
create policy local_minihomes_owner_update
  on public.local_minihomes
  for update
  to authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_minihomes.local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.local_spots s
      where s.id = local_minihomes.local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

drop policy if exists local_minihomes_owner_delete on public.local_minihomes;
create policy local_minihomes_owner_delete
  on public.local_minihomes
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_minihomes.local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

grant select on table public.local_minihomes to anon, authenticated;
grant insert, update, delete on table public.local_minihomes to authenticated;

alter table public.local_orders
  add column if not exists visit_at timestamptz,
  add column if not exists party_size integer not null default 1;

alter table public.local_orders
  drop constraint if exists local_orders_party_size_range;

alter table public.local_orders
  add constraint local_orders_party_size_range check (party_size between 1 and 99);

comment on column public.local_orders.visit_at is '매장 방문(예약) 목표 시각 — 당일 예약 UX.';
comment on column public.local_orders.party_size is '방문 인원.';

notify pgrst, 'reload_schema';
