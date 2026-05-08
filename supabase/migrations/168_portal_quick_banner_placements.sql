-- 포털 퀵메뉴 그리드 1·7번째 칸 전용 스폰서 placement 확장

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
      'in_content',
      'portal_quick_1',
      'portal_quick_7'
    )
  );

comment on constraint premium_banners_placement_check on public.premium_banners is
  'Philgo형 배너 + 포털 퀵메뉴 1·7번 타일 portal_quick_*';
