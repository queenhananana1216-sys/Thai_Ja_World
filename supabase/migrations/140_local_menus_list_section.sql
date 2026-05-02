-- local_menus: 메뉴판 / 가격표 / 시술표 구분 (광고주 대시보드 탭)

alter table public.local_menus
  add column if not exists list_section text;

update public.local_menus
set list_section = 'menu'
where list_section is null;

alter table public.local_menus
  alter column list_section set default 'menu',
  alter column list_section set not null;

alter table public.local_menus drop constraint if exists local_menus_list_section_chk;
alter table public.local_menus
  add constraint local_menus_list_section_chk
  check (list_section in ('menu', 'pricing', 'service'));

comment on column public.local_menus.list_section is 'menu=메뉴판, pricing=가격표, service=시술표';

create index if not exists idx_local_menus_spot_section_sort
  on public.local_menus (local_spot_id, list_section, sort_order asc, created_at desc);

notify pgrst, 'reload_schema';
