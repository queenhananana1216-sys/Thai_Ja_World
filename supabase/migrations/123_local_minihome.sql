-- =============================================================================
-- 123_local_minihome — 로컬 업체 디지털 메뉴판(local_menus) + 주문 예약(local_orders)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. local_menus
-- -----------------------------------------------------------------------------
create table if not exists public.local_menus (
  id uuid primary key default gen_random_uuid(),
  local_spot_id uuid not null references public.local_spots (id) on delete cascade,
  name text not null,
  description text,
  price_thb numeric(12, 2) not null default 0,
  image_url text,
  is_sold_out boolean not null default false,
  is_special boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint local_menus_name_len check (char_length(trim(name)) between 1 and 200),
  constraint local_menus_price_nonneg check (price_thb >= 0)
);

comment on table public.local_menus is '로컬 스팟 디지털 메뉴/시술 행. QR 메뉴판 UI 및 품절·스페셜 관리.';

create index if not exists idx_local_menus_spot_sort
  on public.local_menus (local_spot_id, sort_order asc, created_at desc);

drop trigger if exists trg_local_menus_updated_at on public.local_menus;
create trigger trg_local_menus_updated_at
  before update on public.local_menus
  for each row execute function public.set_updated_at();

alter table public.local_menus enable row level security;

drop policy if exists local_menus_select_public_or_owner on public.local_menus;
create policy local_menus_select_public_or_owner on public.local_menus
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_menus.local_spot_id
        and (s.is_published = true or s.owner_profile_id is not distinct from auth.uid())
    )
  );

drop policy if exists local_menus_insert_owner on public.local_menus;
create policy local_menus_insert_owner on public.local_menus
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.local_spots s
      where s.id = local_menus.local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

drop policy if exists local_menus_update_owner on public.local_menus;
create policy local_menus_update_owner on public.local_menus
  for update
  to authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_menus.local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.local_spots s
      where s.id = local_menus.local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

drop policy if exists local_menus_delete_owner on public.local_menus;
create policy local_menus_delete_owner on public.local_menus
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_menus.local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

grant select on table public.local_menus to anon, authenticated;
grant insert, update, delete on table public.local_menus to authenticated;

-- -----------------------------------------------------------------------------
-- 2. local_orders (결제·주문 확장 예약)
-- -----------------------------------------------------------------------------
create table if not exists public.local_orders (
  id uuid primary key default gen_random_uuid(),
  local_spot_id uuid not null references public.local_spots (id) on delete cascade,
  customer_profile_id uuid references public.profiles (id) on delete set null,
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'pending_payment',
        'paid',
        'preparing',
        'ready',
        'completed',
        'cancelled'
      )
    ),
  currency text not null default 'THB',
  items jsonb not null default '[]'::jsonb,
  subtotal_thb numeric(14, 2),
  total_thb numeric(14, 2),
  payment_provider text,
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint local_orders_items_array check (jsonb_typeof(items) = 'array'),
  constraint local_orders_notes_len check (notes is null or char_length(notes) <= 4000)
);

comment on table public.local_orders is '로컬 스팟 주문·결제 확장용. 행(JSON items 스냅샷) + 외부 결제 참조.';

create index if not exists idx_local_orders_spot_created
  on public.local_orders (local_spot_id, created_at desc);

create index if not exists idx_local_orders_customer
  on public.local_orders (customer_profile_id, created_at desc)
  where customer_profile_id is not null;

drop trigger if exists trg_local_orders_updated_at on public.local_orders;
create trigger trg_local_orders_updated_at
  before update on public.local_orders
  for each row execute function public.set_updated_at();

alter table public.local_orders enable row level security;

drop policy if exists local_orders_select_party on public.local_orders;
create policy local_orders_select_party on public.local_orders
  for select
  to authenticated
  using (
    customer_profile_id is not distinct from auth.uid()
    or exists (
      select 1 from public.local_spots s
      where s.id = local_orders.local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

drop policy if exists local_orders_insert_customer on public.local_orders;
create policy local_orders_insert_customer on public.local_orders
  for insert
  to authenticated
  with check (
    customer_profile_id is not distinct from auth.uid()
    and exists (
      select 1 from public.local_spots s
      where s.id = local_orders.local_spot_id
        and s.is_published = true
    )
  );

drop policy if exists local_orders_update_owner on public.local_orders;
create policy local_orders_update_owner on public.local_orders
  for update
  to authenticated
  using (
    exists (
      select 1 from public.local_spots s
      where s.id = local_orders.local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.local_spots s
      where s.id = local_orders.local_spot_id
        and s.owner_profile_id is not distinct from auth.uid()
    )
  );

grant select, insert on table public.local_orders to authenticated;
grant update on table public.local_orders to authenticated;

notify pgrst, 'reload_schema';
