-- =============================================================================
-- 079_local_shop_delivery_requests.sql
-- 로컬 미니홈 예약제 퀵배달 요청 테이블 + 오너 관리 RLS
-- =============================================================================

create table if not exists public.local_shop_delivery_requests (
  id                  uuid primary key default gen_random_uuid(),
  local_spot_id       uuid not null references public.local_spots (id) on delete cascade,
  requester_profile_id uuid references auth.users (id) on delete set null,
  requester_name      text not null,
  requester_phone     text not null,
  delivery_address    text not null,
  order_summary       text not null,
  desired_at          timestamptz not null,
  status              text not null default 'requested',
  owner_memo          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint local_shop_delivery_requests_status_chk
    check (status in ('requested', 'confirmed', 'dispatching', 'completed', 'cancelled')),
  constraint local_shop_delivery_requests_name_len_chk
    check (char_length(trim(requester_name)) between 2 and 80),
  constraint local_shop_delivery_requests_phone_len_chk
    check (char_length(trim(requester_phone)) between 6 and 40),
  constraint local_shop_delivery_requests_addr_len_chk
    check (char_length(trim(delivery_address)) between 5 and 400),
  constraint local_shop_delivery_requests_order_len_chk
    check (char_length(trim(order_summary)) between 2 and 2000)
);

create index if not exists idx_local_shop_delivery_requests_spot_created
  on public.local_shop_delivery_requests (local_spot_id, created_at desc);

create index if not exists idx_local_shop_delivery_requests_spot_status
  on public.local_shop_delivery_requests (local_spot_id, status, desired_at desc);

drop trigger if exists trg_local_shop_delivery_requests_set_updated_at on public.local_shop_delivery_requests;
create trigger trg_local_shop_delivery_requests_set_updated_at
  before update on public.local_shop_delivery_requests
  for each row execute function public.set_updated_at();

alter table public.local_shop_delivery_requests enable row level security;

drop policy if exists local_shop_delivery_requests_select_owner_or_requester on public.local_shop_delivery_requests;
create policy local_shop_delivery_requests_select_owner_or_requester
  on public.local_shop_delivery_requests
  for select
  to authenticated
  using (
    requester_profile_id = auth.uid()
    or exists (
      select 1
      from public.local_spots s
      where s.id = local_shop_delivery_requests.local_spot_id
        and s.owner_profile_id = auth.uid()
    )
  );

drop policy if exists local_shop_delivery_requests_insert_auth on public.local_shop_delivery_requests;
create policy local_shop_delivery_requests_insert_auth
  on public.local_shop_delivery_requests
  for insert
  to authenticated
  with check (
    requester_profile_id = auth.uid()
    and exists (
      select 1
      from public.local_spots s
      where s.id = local_shop_delivery_requests.local_spot_id
        and s.is_published = true
    )
  );

drop policy if exists local_shop_delivery_requests_update_owner on public.local_shop_delivery_requests;
create policy local_shop_delivery_requests_update_owner
  on public.local_shop_delivery_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = local_shop_delivery_requests.local_spot_id
        and s.owner_profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.local_spots s
      where s.id = local_shop_delivery_requests.local_spot_id
        and s.owner_profile_id = auth.uid()
    )
  );

grant select, insert, update on table public.local_shop_delivery_requests to authenticated;
