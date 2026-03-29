-- =============================================================================
-- 035_site_copy_public_strings — 홈 히어로 등 공개 문구 (관리자 API로 수정, anon 읽기)
-- =============================================================================

create table if not exists public.site_copy (
  key text not null,
  locale text not null default 'ko',
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (key, locale)
);

create index if not exists site_copy_locale_idx on public.site_copy (locale);

comment on table public.site_copy is
  '사이트 공개 문자열. key 예: home_hero_brand_tai, home_hero_title. 쓰기는 service_role(관리자 API)만.';

alter table public.site_copy enable row level security;

drop policy if exists "site_copy_select_public" on public.site_copy;
create policy "site_copy_select_public"
  on public.site_copy
  for select
  to anon, authenticated
  using (true);
