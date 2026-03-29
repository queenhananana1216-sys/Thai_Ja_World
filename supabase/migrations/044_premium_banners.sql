-- ============================================================
-- 044_premium_banners.sql
-- 프리미엄/프로모 배너 — 슬롯별 상단·홈 스트립 등 (관리자 CRUD, 공개 조회)
-- ============================================================

create table if not exists public.premium_banners (
  id          uuid primary key default gen_random_uuid(),
  slot        text not null default 'top_bar'
    check (slot in ('top_bar', 'home_strip', 'sidebar')),
  title       text not null default '',
  subtitle    text,
  image_url   text,
  href        text,
  badge_text  text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  extra       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.premium_banners is '사이트 전역 배너. slot=top_bar 는 네비 아래 풀폭 스트립. extra 로 A/B·캠페인 코드 확장.';
comment on column public.premium_banners.slot is 'top_bar | home_strip | sidebar — 앱에서 슬롯별로 조회';

create index if not exists premium_banners_slot_active_idx
  on public.premium_banners (slot, is_active, sort_order asc);

drop trigger if exists trg_premium_banners_updated_at on public.premium_banners;
create trigger trg_premium_banners_updated_at
  before update on public.premium_banners
  for each row execute function public.set_updated_at();

alter table public.premium_banners enable row level security;

drop policy if exists premium_banners_select_public on public.premium_banners;
create policy premium_banners_select_public
  on public.premium_banners for select
  to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );
