-- =============================================================================
-- bestvip77: 통신사(한국/중국) + 관리자 승인 후 사이트 이용
-- 가입 시 user metadata: bestvip77=true, carrier_country KR|CN, carrier_label
-- =============================================================================

create table if not exists public.bestvip77_member_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  carrier_country text not null check (carrier_country in ('KR', 'CN')),
  carrier_label text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bestvip77_member_profiles_status_idx
  on public.bestvip77_member_profiles (status)
  where status = 'pending';

comment on table public.bestvip77_member_profiles is
  'bestvip77 회원 승인·통신사 정보. auth.users 메타 bestvip77=true 일 때 트리거로 생성.';

alter table public.bestvip77_member_profiles enable row level security;

drop policy if exists "bestvip77_member_select_own" on public.bestvip77_member_profiles;
create policy "bestvip77_member_select_own"
  on public.bestvip77_member_profiles for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "bestvip77_member_select_admin" on public.bestvip77_member_profiles;
create policy "bestvip77_member_select_admin"
  on public.bestvip77_member_profiles for select
  to authenticated
  using (public.bestvip77_is_admin());

drop policy if exists "bestvip77_member_insert_own_pending" on public.bestvip77_member_profiles;
create policy "bestvip77_member_insert_own_pending"
  on public.bestvip77_member_profiles for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
  );

drop policy if exists "bestvip77_member_update_admin" on public.bestvip77_member_profiles;
create policy "bestvip77_member_update_admin"
  on public.bestvip77_member_profiles for update
  to authenticated
  using (public.bestvip77_is_admin())
  with check (public.bestvip77_is_admin());

-- ---------------------------------------------------------------------------
-- auth.users INSERT → bestvip77 가입 메타가 있을 때만 프로필 행 생성
-- ---------------------------------------------------------------------------
create or replace function public.bestvip77_auth_user_hook()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  cc text;
  cl text;
begin
  if coalesce(new.raw_user_meta_data->>'bestvip77', '') not in ('true', '1') then
    return new;
  end if;

  cc := upper(trim(coalesce(new.raw_user_meta_data->>'carrier_country', '')));
  if cc not in ('KR', 'CN') then
    cc := 'KR';
  end if;

  cl := nullif(trim(coalesce(new.raw_user_meta_data->>'carrier_label', '')), '');

  insert into public.bestvip77_member_profiles (user_id, email, carrier_country, carrier_label, status)
  values (new.id, new.email, cc, cl, 'pending')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.bestvip77_auth_user_hook() is
  'auth.users INSERT 시 raw_user_meta_data.bestvip77 이 true 이면 bestvip77_member_profiles pending 생성.';

alter function public.bestvip77_auth_user_hook() owner to postgres;

grant execute on function public.bestvip77_auth_user_hook() to supabase_auth_admin;

drop trigger if exists trg_bestvip77_auth_user on auth.users;
create trigger trg_bestvip77_auth_user
  after insert on auth.users
  for each row
  execute function public.bestvip77_auth_user_hook();
