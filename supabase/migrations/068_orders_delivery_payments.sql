-- 068_orders_delivery_payments.sql
-- Same-day reservation delivery + card/crypto payment domain

create table if not exists public.delivery_slots (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.local_spots (id) on delete cascade,
  slot_date date not null,
  slot_start time not null,
  slot_end time not null,
  max_orders integer not null default 10 check (max_orders > 0),
  fee_thb numeric(10, 2) not null default 0 check (fee_thb >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, slot_date, slot_start)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  shop_id uuid not null references public.local_spots (id) on delete restrict,
  delivery_slot_id uuid references public.delivery_slots (id) on delete set null,
  status text not null
    check (status in ('pending', 'paid', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_method text not null check (payment_method in ('card', 'crypto', 'cash')),
  payment_provider text,
  payment_ref text,
  total_amount_thb numeric(12, 2) not null check (total_amount_thb >= 0),
  currency text not null default 'THB',
  contact_phone text,
  delivery_address text,
  notes text,
  requested_delivery_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_thb numeric(12, 2) not null check (unit_price_thb >= 0),
  line_total_thb numeric(12, 2) not null check (line_total_thb >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null
    check (status in ('pending', 'paid', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'coinbase')),
  status text not null,
  amount_thb numeric(12, 2) not null check (amount_thb >= 0),
  external_id text,
  checkout_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists delivery_slots_shop_date_idx
  on public.delivery_slots (shop_id, slot_date, slot_start);
create index if not exists orders_customer_idx
  on public.orders (customer_id, created_at desc);
create index if not exists orders_shop_idx
  on public.orders (shop_id, created_at desc);
create index if not exists orders_status_idx
  on public.orders (status);
create index if not exists order_items_order_idx
  on public.order_items (order_id);
create index if not exists order_events_order_idx
  on public.order_status_events (order_id, created_at desc);
create index if not exists order_payment_intents_provider_idx
  on public.order_payment_intents (provider, status, created_at desc);

drop trigger if exists trg_delivery_slots_updated_at on public.delivery_slots;
create trigger trg_delivery_slots_updated_at
  before update on public.delivery_slots
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists trg_order_payment_intents_updated_at on public.order_payment_intents;
create trigger trg_order_payment_intents_updated_at
  before update on public.order_payment_intents
  for each row execute function public.set_updated_at();

alter table public.delivery_slots enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.order_payment_intents enable row level security;

drop policy if exists delivery_slots_public_select on public.delivery_slots;
create policy delivery_slots_public_select
  on public.delivery_slots
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = shop_id
        and s.is_published = true
    )
  );

drop policy if exists delivery_slots_owner_manage on public.delivery_slots;
create policy delivery_slots_owner_manage
  on public.delivery_slots
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = shop_id
        and s.owner_profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.local_spots s
      where s.id = shop_id
        and s.owner_profile_id = auth.uid()
    )
  );

drop policy if exists orders_customer_select on public.orders;
create policy orders_customer_select
  on public.orders
  for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists orders_shop_owner_select on public.orders;
create policy orders_shop_owner_select
  on public.orders
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = shop_id
        and s.owner_profile_id = auth.uid()
    )
  );

drop policy if exists orders_customer_insert on public.orders;
create policy orders_customer_insert
  on public.orders
  for insert
  to authenticated
  with check (customer_id = auth.uid());

drop policy if exists orders_customer_update on public.orders;
create policy orders_customer_update
  on public.orders
  for update
  to authenticated
  using (
    customer_id = auth.uid()
    and status in ('pending', 'paid')
  )
  with check (
    customer_id = auth.uid()
    and status in ('pending', 'paid', 'cancelled')
  );

drop policy if exists orders_shop_owner_update on public.orders;
create policy orders_shop_owner_update
  on public.orders
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = shop_id
        and s.owner_profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.local_spots s
      where s.id = shop_id
        and s.owner_profile_id = auth.uid()
    )
  );

drop policy if exists order_items_visible_if_order_visible on public.order_items;
create policy order_items_visible_if_order_visible
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or exists (
            select 1
            from public.local_spots s
            where s.id = o.shop_id
              and s.owner_profile_id = auth.uid()
          )
        )
    )
  );

drop policy if exists order_items_insert_by_order_owner on public.order_items;
create policy order_items_insert_by_order_owner
  on public.order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );

drop policy if exists order_status_events_visible_if_order_visible on public.order_status_events;
create policy order_status_events_visible_if_order_visible
  on public.order_status_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or exists (
            select 1
            from public.local_spots s
            where s.id = o.shop_id
              and s.owner_profile_id = auth.uid()
          )
        )
    )
  );

drop policy if exists order_status_events_insert_by_order_actor on public.order_status_events;
create policy order_status_events_insert_by_order_actor
  on public.order_status_events
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or exists (
            select 1
            from public.local_spots s
            where s.id = o.shop_id
              and s.owner_profile_id = auth.uid()
          )
        )
    )
  );

drop policy if exists order_payment_intents_visible_if_order_visible on public.order_payment_intents;
create policy order_payment_intents_visible_if_order_visible
  on public.order_payment_intents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or exists (
            select 1
            from public.local_spots s
            where s.id = o.shop_id
              and s.owner_profile_id = auth.uid()
          )
        )
    )
  );

drop policy if exists order_payment_intents_insert_by_order_owner on public.order_payment_intents;
create policy order_payment_intents_insert_by_order_owner
  on public.order_payment_intents
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );
