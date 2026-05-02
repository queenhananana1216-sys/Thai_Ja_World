-- =============================================================================
-- 131_b2b_saas_billing.sql
-- 로컬 가게 B2B SaaS 구독 청구: Stripe Customer / 구독 상태 / 트라이얼 종료 시각
-- PostgREST: NOTIFY pgrst, 'reload_schema';
-- =============================================================================

do $$
begin
  create type public.local_spot_subscription_status as enum (
    'none',
    'trialing',
    'active',
    'canceled'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.local_spots
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_status public.local_spot_subscription_status not null default 'none',
  add column if not exists trial_ends_at timestamptz;

comment on column public.local_spots.stripe_customer_id is 'Stripe Customer id (cus_...). 웹훅·포털 동기화용.';
comment on column public.local_spots.subscription_status is 'B2B SaaS 구독 상태(none/trialing/active/canceled).';
comment on column public.local_spots.trial_ends_at is 'Stripe 구독 트라이얼 종료 시각(없으면 null).';

create index if not exists local_spots_stripe_customer_id_idx
  on public.local_spots (stripe_customer_id)
  where stripe_customer_id is not null;

-- 오너가 결제·구독 메타를 직접 조작하지 못하도록 기존 가드에 포함 (서비스 롤은 auth.uid() null로 통과)
create or replace function public.local_spots_restrict_owner_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if old.owner_profile_id is null or old.owner_profile_id is distinct from auth.uid() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.owner_profile_id is distinct from old.owner_profile_id
     or new.slug is distinct from old.slug
     or new.name is distinct from old.name
     or new.description is distinct from old.description
     or new.line_url is distinct from old.line_url
     or new.photo_urls is distinct from old.photo_urls
     or new.category is distinct from old.category
     or new.tags is distinct from old.tags
     or new.sort_order is distinct from old.sort_order
     or new.extra is distinct from old.extra
     or new.minihome_public_slug is distinct from old.minihome_public_slug
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.subscription_status is distinct from old.subscription_status
     or new.trial_ends_at is distinct from old.trial_ends_at
  then
    raise exception 'LOCAL_SPOT_OWNER_MINIHOME_ONLY: 소유자는 미니홈 콘텐츠(소개·테마·BGM·메뉴·레이아웃·minihome_extra)와 공개 상태만 수정할 수 있습니다';
  end if;

  return new;
end;
$$;

comment on function public.local_spots_restrict_owner_update() is
  'local_spots: 오너는 미니홈·공개 토글만; Stripe 구독 메타는 서비스 롤만 변경.';

notify pgrst, 'reload_schema';
