-- =============================================================================
-- 076_minihome_diary.sql
-- 미니홈 다이어리 테이블 + RLS
-- =============================================================================

create table if not exists public.minihome_diary_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  body text not null,
  mood text check (mood in ('happy','sad','angry','love','tired','neutral')) default 'neutral',
  is_secret boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 테이블만 예전에 있던 DB: CREATE IF NOT EXISTS 가 스킵되면 is_secret 이 없을 수 있음.
alter table public.minihome_diary_entries
  add column if not exists is_secret boolean not null default false;

create index if not exists idx_diary_owner_created
  on public.minihome_diary_entries (owner_id, created_at desc);

alter table public.minihome_diary_entries enable row level security;

-- 주인만 자기 일기 CRUD (재실행·부분 적용 DB 대비 idempotent)
drop policy if exists diary_select_own on public.minihome_diary_entries;
create policy diary_select_own on public.minihome_diary_entries
  for select using (owner_id = auth.uid());

drop policy if exists diary_insert_own on public.minihome_diary_entries;
create policy diary_insert_own on public.minihome_diary_entries
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists diary_update_own on public.minihome_diary_entries;
create policy diary_update_own on public.minihome_diary_entries
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists diary_delete_own on public.minihome_diary_entries;
create policy diary_delete_own on public.minihome_diary_entries
  for delete to authenticated
  using (owner_id = auth.uid());

-- 비밀이 아닌 일기는 미니홈 방문자에게 공개 (section_visibility 체크는 클라이언트)
drop policy if exists diary_select_public on public.minihome_diary_entries;
create policy diary_select_public on public.minihome_diary_entries
  for select using (is_secret = false);
