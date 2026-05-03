-- =============================================================================
-- 144_profiles_premium_subscription.sql
-- 소비자 프리미엄 월 구독(Stripe) — 결제 성공 시 is_premium 동기화용 컬럼
-- =============================================================================

alter table public.profiles
  add column if not exists is_premium boolean not null default false,
  add column if not exists premium_plan text,
  add column if not exists premium_stripe_subscription_id text;

comment on column public.profiles.is_premium is
  'Stripe 월 구독 등 프리미엄 혜택 활성 여부(웹훅 동기화).';
comment on column public.profiles.premium_plan is
  '프리미엄 플랜 식별자: basic | pro | sponsor 등.';
comment on column public.profiles.premium_stripe_subscription_id is
  'Stripe Subscription id (sub_...). 해지·상태 갱신 매칭용.';

create unique index if not exists profiles_premium_stripe_subscription_id_uidx
  on public.profiles (premium_stripe_subscription_id)
  where premium_stripe_subscription_id is not null;

notify pgrst, 'reload_schema';
