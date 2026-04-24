-- =============================================================================
-- 098_premium_banners_placement.sql
--
-- premium_banners 확장: Philgo 스타일 좌/우 윙(wing_left / wing_right) + 라우트 스코프(route_group).
-- 기존 044_premium_banners.sql 의 slot check('top_bar','home_strip','sidebar') 를
-- 느슨하게 열어 wing_left/wing_right/header_side/in_content 를 허용하고,
-- 레이아웃 예약(CLS 방지)을 위한 image_width/image_height 을 추가한다.
--
-- 실 컬럼 중심 필드만 추가 (필터·인덱스에 쓰는 값은 jsonb 아닌 컬럼).
-- 데이터 백필:
--   - 기존 slot='sidebar' → placement='wing_right', route_group='all'
--   - 기존 slot='top_bar' → placement='top_bar', route_group='all'
--   - 기존 slot='home_strip' → placement='home_strip', route_group='home'
-- =============================================================================

-- 1) slot check 완화 — 새 placement 값도 저장 가능하게 (slot 은 레거시 호환으로 유지)
alter table public.premium_banners
  drop constraint if exists premium_banners_slot_check;

alter table public.premium_banners
  add constraint premium_banners_slot_check
  check (
    slot in (
      'top_bar',
      'home_strip',
      'sidebar',
      'wing_left',
      'wing_right',
      'header_side',
      'in_content'
    )
  );

-- 2) placement / route_group / 이미지 크기 / 스폰서 라벨
alter table public.premium_banners
  add column if not exists placement text,
  add column if not exists route_group text not null default 'all',
  add column if not exists image_width int,
  add column if not exists image_height int,
  add column if not exists sponsor_label text;

-- placement 값 제약
alter table public.premium_banners
  drop constraint if exists premium_banners_placement_check;

alter table public.premium_banners
  add constraint premium_banners_placement_check
  check (
    placement is null or placement in (
      'top_bar',
      'home_strip',
      'wing_left',
      'wing_right',
      'header_side',
      'in_content'
    )
  );

-- route_group 값 제약 (운영에서 필요하면 여기만 수정)
alter table public.premium_banners
  drop constraint if exists premium_banners_route_group_check;

alter table public.premium_banners
  add constraint premium_banners_route_group_check
  check (
    route_group in (
      'all',
      'home',
      'community',
      'boards',
      'tips',
      'news',
      'local',
      'minihome'
    )
  );

-- 3) 백필: 기존 행을 새 체계로 정리 (placement 가 비어 있을 때만)
update public.premium_banners
set placement = 'top_bar'
where placement is null and slot = 'top_bar';

update public.premium_banners
set
  placement = 'home_strip',
  route_group = case when route_group = 'all' then 'home' else route_group end
where placement is null and slot = 'home_strip';

update public.premium_banners
set placement = 'wing_right'
where placement is null and slot = 'sidebar';

-- 그 외(레거시가 아닌 신규 행)는 placement 를 작성자가 채우는 것이 원칙.
-- 조회 시 placement is null 이면 slot 으로 폴백 — 앱 로직에서 보장.

-- 4) 인덱스: 공개 조회는 placement + route_group + is_active + 정렬
drop index if exists premium_banners_placement_route_idx;
create index premium_banners_placement_route_idx
  on public.premium_banners (placement, route_group, is_active, sort_order asc);

-- 기존 slot 기반 인덱스는 레거시 호환용으로 유지 (044 에서 생성).

-- 5) comments
comment on column public.premium_banners.placement is
  'top_bar / home_strip / wing_left / wing_right / header_side / in_content — 프런트 슬롯';
comment on column public.premium_banners.route_group is
  'all | home | community | boards | tips | news | local | minihome — 프런트에서 pathname 매칭';
comment on column public.premium_banners.image_width is 'CLS 방지용 이미지 원본 가로(px)';
comment on column public.premium_banners.image_height is 'CLS 방지용 이미지 원본 세로(px)';
comment on column public.premium_banners.sponsor_label is
  '광고/스폰서 표기 라벨 (법적 고지·접근성용). 비우면 표시 안 함.';
