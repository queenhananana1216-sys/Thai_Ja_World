-- Stripe 타이(THAI) 충전 원장 — 웹훅 멱등(세션 단위)·감사
create table if not exists public.stripe_thai_topup_ledger (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id text not null unique,
  stripe_event_id text not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  thai_pack text not null,
  thai_credits int not null check (thai_credits > 0),
  amount_thb int not null check (amount_thb > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_stripe_thai_topup_ledger_profile
  on public.stripe_thai_topup_ledger (profile_id, created_at desc);

comment on table public.stripe_thai_topup_ledger is
  'Stripe Checkout (tjw_thai_topup) 완료 시 1회 기록 — 중복 웹훅 방지 및 정산 참고';

alter table public.stripe_thai_topup_ledger enable row level security;

-- 웹훅 단일 트랜잭션: 원장 삽입(멱등) + 프로필 잔액 가산
create or replace function public.apply_stripe_thai_topup_credit(
  p_checkout_session_id text,
  p_stripe_event_id text,
  p_profile_id uuid,
  p_pack text,
  p_credits int,
  p_amount_thb int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal int;
  v_ins bigint;
begin
  insert into public.stripe_thai_topup_ledger (
    checkout_session_id,
    stripe_event_id,
    profile_id,
    thai_pack,
    thai_credits,
    amount_thb
  ) values (
    p_checkout_session_id,
    p_stripe_event_id,
    p_profile_id,
    p_pack,
    p_credits,
    p_amount_thb
  )
  on conflict (checkout_session_id) do nothing;
  get diagnostics v_ins = row_count;

  if v_ins = 0 then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  update public.profiles
  set thai_balance = coalesce(thai_balance, 0) + p_credits
  where id = p_profile_id
  returning thai_balance into v_bal;

  if v_bal is null then
    raise exception 'profile_not_found_for_thai_topup';
  end if;

  return jsonb_build_object('ok', true, 'duplicate', false, 'thai_balance', v_bal);
end;
$$;

comment on function public.apply_stripe_thai_topup_credit(text, text, uuid, text, int, int) is
  'Stripe 타이 충전 웹훅 전용 — 멱등·원장+잔액 원자 적용';

revoke all on function public.apply_stripe_thai_topup_credit(text, text, uuid, text, int, int) from public;
grant execute on function public.apply_stripe_thai_topup_credit(text, text, uuid, text, int, int) to service_role;
