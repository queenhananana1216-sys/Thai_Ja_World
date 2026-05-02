-- 로컬 디지털 메뉴: 이미지 URL·설명 컬럼 보강 (선행 123에 이미 있을 수 있음 → IF NOT EXISTS)
-- PostgREST 스키마 캐시 갱신: 아래 NOTIFY

alter table public.local_menus
  add column if not exists image_url text,
  add column if not exists description text;

comment on column public.local_menus.image_url is '메뉴·시술 대표 이미지 URL(스토리지 공개 URL 등).';
comment on column public.local_menus.description is '단일 입력 원문 또는 보조 설명; 다국어는 name_i18n 등과 함께 UI에서 결합.';

notify pgrst, 'reload_schema';
