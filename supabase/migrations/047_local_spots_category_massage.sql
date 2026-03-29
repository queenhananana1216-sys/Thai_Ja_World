-- 마사지·스파 등 로컬 서비스 구분용 카테고리 추가

alter table public.local_spots drop constraint if exists local_spots_category_check;

alter table public.local_spots
  add constraint local_spots_category_check check (
    category in (
      'restaurant',
      'cafe',
      'night_market',
      'service',
      'shopping',
      'other',
      'massage'
    )
  );

comment on column public.local_spots.category is
  'restaurant|cafe|night_market|service|shopping|massage|other — massage 는 마사지·스파·힐링 등';
