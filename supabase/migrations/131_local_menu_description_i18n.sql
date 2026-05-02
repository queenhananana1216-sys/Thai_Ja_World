-- 로컬 메뉴: 설명 다국어(JSON) — 방문객 언어 토글용
alter table public.local_menus
  add column if not exists description_i18n jsonb;

comment on column public.local_menus.description_i18n is
  'Optional copy per locale, e.g. {"ko":"…","th":"…","en":"…","zh":"…"}. Fallback: description.';

notify pgrst, 'reload_schema';
