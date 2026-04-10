-- =============================================================================
-- 075_minihome_privacy_visits.sql
-- 미니홈 섹션별 공개 설정 + 방문자 카운터
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 섹션별 공개 설정 (전체공개/일촌만/비공개)
-- -----------------------------------------------------------------------------
alter table public.user_minihomes
  add column if not exists section_visibility jsonb not null default '{
    "intro": "public",
    "guestbook": "public",
    "photos": "ilchon",
    "diary": "ilchon"
  }'::jsonb;

comment on column public.user_minihomes.section_visibility is
  '섹션별 공개 범위: "public" (전체), "ilchon" (일촌만), "private" (비공개/나만)';

-- -----------------------------------------------------------------------------
-- 2. 방문자 카운터
-- -----------------------------------------------------------------------------
alter table public.user_minihomes
  add column if not exists visit_count_total int not null default 0,
  add column if not exists visit_count_today int not null default 0,
  add column if not exists visit_count_date date not null default current_date;

-- 방문 기록 테이블 (중복 방문 방지)
create table if not exists public.minihome_visits (
  id bigint generated always as identity primary key,
  minihome_owner_id uuid not null references public.user_minihomes(owner_id) on delete cascade,
  visitor_id uuid not null references public.profiles(id) on delete cascade,
  visited_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint minihome_visits_unique unique (minihome_owner_id, visitor_id, visited_date)
);

create index if not exists idx_minihome_visits_owner_date
  on public.minihome_visits (minihome_owner_id, visited_date desc);

alter table public.minihome_visits enable row level security;

drop policy if exists minihome_visits_insert_auth on public.minihome_visits;
create policy minihome_visits_insert_auth on public.minihome_visits
  for insert to authenticated
  with check (visitor_id = auth.uid());

drop policy if exists minihome_visits_select_owner on public.minihome_visits;
create policy minihome_visits_select_owner on public.minihome_visits
  for select to authenticated
  using (minihome_owner_id = auth.uid() or visitor_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 3. RPC: 방문 기록 + 카운터 증가
-- -----------------------------------------------------------------------------
create or replace function public.minihome_record_visit(p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := current_date;
  already boolean;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  end if;
  if uid = p_owner_id then
    return jsonb_build_object('ok', false, 'reason', 'SELF_VISIT');
  end if;

  select exists(
    select 1 from public.minihome_visits
    where minihome_owner_id = p_owner_id
      and visitor_id = uid
      and visited_date = today
  ) into already;

  if already then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_VISITED');
  end if;

  insert into public.minihome_visits (minihome_owner_id, visitor_id, visited_date)
  values (p_owner_id, uid, today);

  -- 날짜 리셋 체크
  update public.user_minihomes
  set
    visit_count_today = case when visit_count_date = today then visit_count_today + 1 else 1 end,
    visit_count_total = visit_count_total + 1,
    visit_count_date = today
  where owner_id = p_owner_id;

  return jsonb_build_object('ok', true);
end;
$$;

alter function public.minihome_record_visit(uuid) owner to postgres;
grant execute on function public.minihome_record_visit(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. RPC: 섹션 공개 설정 변경
-- -----------------------------------------------------------------------------
create or replace function public.minihome_update_section_visibility(
  p_section text,
  p_visibility text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_visibility not in ('public', 'ilchon', 'private') then
    raise exception 'INVALID_VISIBILITY';
  end if;
  if p_section not in ('intro', 'guestbook', 'photos', 'diary') then
    raise exception 'INVALID_SECTION';
  end if;

  update public.user_minihomes
  set section_visibility = jsonb_set(
    coalesce(section_visibility, '{}'::jsonb),
    array[p_section],
    to_jsonb(p_visibility)
  )
  where owner_id = uid;

  return jsonb_build_object('ok', true, 'section', p_section, 'visibility', p_visibility);
end;
$$;

alter function public.minihome_update_section_visibility(text, text) owner to postgres;
grant execute on function public.minihome_update_section_visibility(text, text) to authenticated;
