-- 057_payment_domain_foundation.sql
-- Payment domain foundation schema for card/grabpay/wallet.

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('card', 'grabpay', 'wallet')),
  status text not null default 'pending' check (
    status in ('pending', 'requires_action', 'authorized', 'captured', 'failed', 'canceled', 'refunded')
  ),
  currency text not null check (char_length(currency) = 3),
  amount_minor bigint not null check (amount_minor > 0),
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_orders_profile_created
  on public.payment_orders (profile_id, created_at desc);

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.payment_orders (id) on delete cascade,
  provider text not null check (provider in ('card', 'grabpay', 'wallet')),
  status text not null default 'initiated' check (
    status in ('initiated', 'requires_action', 'authorized', 'captured', 'failed', 'canceled')
  ),
  external_payment_id text,
  external_checkout_url text,
  failure_code text,
  failure_message text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (char_length(currency) = 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_attempts_order_created
  on public.payment_attempts (order_id, created_at desc);

create unique index if not exists uq_payment_attempts_external_payment_id
  on public.payment_attempts (external_payment_id)
  where external_payment_id is not null;

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('card', 'grabpay', 'wallet')),
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  related_order_no text,
  related_external_payment_id text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists idx_payment_events_created
  on public.payment_events (created_at desc);

create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  currency text not null check (char_length(currency) = 3),
  balance_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallet_accounts (id) on delete cascade,
  order_id uuid references public.payment_orders (id) on delete set null,
  direction text not null check (direction in ('credit', 'debit')),
  amount_minor bigint not null check (amount_minor > 0),
  reason text not null,
  reference_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_ledger_wallet_created
  on public.wallet_ledger_entries (wallet_account_id, created_at desc);

create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.payment_orders (id) on delete cascade,
  wallet_account_id uuid not null references public.wallet_accounts (id) on delete cascade,
  topup_status text not null default 'pending' check (
    topup_status in ('pending', 'captured', 'failed', 'canceled', 'refunded')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at_payment_tables()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_payment_orders_updated_at on public.payment_orders;
create trigger trg_payment_orders_updated_at
  before update on public.payment_orders
  for each row execute function public.set_updated_at_payment_tables();

drop trigger if exists trg_payment_attempts_updated_at on public.payment_attempts;
create trigger trg_payment_attempts_updated_at
  before update on public.payment_attempts
  for each row execute function public.set_updated_at_payment_tables();

drop trigger if exists trg_wallet_accounts_updated_at on public.wallet_accounts;
create trigger trg_wallet_accounts_updated_at
  before update on public.wallet_accounts
  for each row execute function public.set_updated_at_payment_tables();

drop trigger if exists trg_wallet_topups_updated_at on public.wallet_topups;
create trigger trg_wallet_topups_updated_at
  before update on public.wallet_topups
  for each row execute function public.set_updated_at_payment_tables();

alter table public.payment_orders enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger_entries enable row level security;
alter table public.wallet_topups enable row level security;

drop policy if exists payment_orders_select_own on public.payment_orders;
create policy payment_orders_select_own on public.payment_orders
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists payment_attempts_select_own on public.payment_attempts;
create policy payment_attempts_select_own on public.payment_attempts
  for select to authenticated
  using (
    exists (
      select 1
      from public.payment_orders o
      where o.id = payment_attempts.order_id
        and o.profile_id = auth.uid()
    )
  );

drop policy if exists wallet_accounts_select_own on public.wallet_accounts;
create policy wallet_accounts_select_own on public.wallet_accounts
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists wallet_ledger_select_own on public.wallet_ledger_entries;
create policy wallet_ledger_select_own on public.wallet_ledger_entries
  for select to authenticated
  using (
    exists (
      select 1
      from public.wallet_accounts a
      where a.id = wallet_ledger_entries.wallet_account_id
        and a.profile_id = auth.uid()
    )
  );

drop policy if exists wallet_topups_select_own on public.wallet_topups;
create policy wallet_topups_select_own on public.wallet_topups
  for select to authenticated
  using (
    exists (
      select 1
      from public.wallet_accounts a
      where a.id = wallet_topups.wallet_account_id
        and a.profile_id = auth.uid()
    )
  );
-- =============================================================================
-- 057_payment_domain_foundation.sql
-- 해외카드/GrabPay/지갑 결제 도메인 기본 스키마
-- - 주문(order), 결제시도(attempt), 웹훅 이벤트(event), 지갑 원장(ledger) 분리
-- - 멱등성 키(unique)로 중복 처리 방지
-- =============================================================================

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('card', 'grabpay', 'wallet')),
  status text not null default 'pending' check (
    status in ('pending', 'requires_action', 'authorized', 'captured', 'failed', 'canceled', 'refunded')
  ),
  currency text not null check (char_length(currency) = 3),
  amount_minor bigint not null check (amount_minor > 0),
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_orders_profile_created
  on public.payment_orders (profile_id, created_at desc);

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.payment_orders (id) on delete cascade,
  provider text not null check (provider in ('card', 'grabpay', 'wallet')),
  status text not null default 'initiated' check (
    status in ('initiated', 'requires_action', 'authorized', 'captured', 'failed', 'canceled')
  ),
  external_payment_id text,
  external_checkout_url text,
  failure_code text,
  failure_message text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (char_length(currency) = 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_attempts_order_created
  on public.payment_attempts (order_id, created_at desc);

create unique index if not exists uq_payment_attempts_external_payment_id
  on public.payment_attempts (external_payment_id)
  where external_payment_id is not null;

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('card', 'grabpay', 'wallet')),
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  related_order_no text,
  related_external_payment_id text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists idx_payment_events_created
  on public.payment_events (created_at desc);

create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  currency text not null check (char_length(currency) = 3),
  balance_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallet_accounts (id) on delete cascade,
  order_id uuid references public.payment_orders (id) on delete set null,
  direction text not null check (direction in ('credit', 'debit')),
  amount_minor bigint not null check (amount_minor > 0),
  reason text not null,
  reference_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_ledger_wallet_created
  on public.wallet_ledger_entries (wallet_account_id, created_at desc);

create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.payment_orders (id) on delete cascade,
  wallet_account_id uuid not null references public.wallet_accounts (id) on delete cascade,
  topup_status text not null default 'pending' check (
    topup_status in ('pending', 'captured', 'failed', 'canceled', 'refunded')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at_payment_tables()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_payment_orders_updated_at on public.payment_orders;
create trigger trg_payment_orders_updated_at
  before update on public.payment_orders
  for each row execute function public.set_updated_at_payment_tables();

drop trigger if exists trg_payment_attempts_updated_at on public.payment_attempts;
create trigger trg_payment_attempts_updated_at
  before update on public.payment_attempts
  for each row execute function public.set_updated_at_payment_tables();

drop trigger if exists trg_wallet_accounts_updated_at on public.wallet_accounts;
create trigger trg_wallet_accounts_updated_at
  before update on public.wallet_accounts
  for each row execute function public.set_updated_at_payment_tables();

drop trigger if exists trg_wallet_topups_updated_at on public.wallet_topups;
create trigger trg_wallet_topups_updated_at
  before update on public.wallet_topups
  for each row execute function public.set_updated_at_payment_tables();

alter table public.payment_orders enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger_entries enable row level security;
alter table public.wallet_topups enable row level security;

drop policy if exists payment_orders_select_own on public.payment_orders;
create policy payment_orders_select_own on public.payment_orders
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists payment_attempts_select_own on public.payment_attempts;
create policy payment_attempts_select_own on public.payment_attempts
  for select to authenticated
  using (
    exists (
      select 1
      from public.payment_orders o
      where o.id = payment_attempts.order_id
        and o.profile_id = auth.uid()
    )
  );

drop policy if exists wallet_accounts_select_own on public.wallet_accounts;
create policy wallet_accounts_select_own on public.wallet_accounts
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists wallet_ledger_select_own on public.wallet_ledger_entries;
create policy wallet_ledger_select_own on public.wallet_ledger_entries
  for select to authenticated
  using (
    exists (
      select 1
      from public.wallet_accounts a
      where a.id = wallet_ledger_entries.wallet_account_id
        and a.profile_id = auth.uid()
    )
  );

drop policy if exists wallet_topups_select_own on public.wallet_topups;
create policy wallet_topups_select_own on public.wallet_topups
  for select to authenticated
  using (
    exists (
      select 1
      from public.wallet_accounts a
      where a.id = wallet_topups.wallet_account_id
        and a.profile_id = auth.uid()
    )
  );
