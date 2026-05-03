-- Rebrand: DB에 남아 있는 '태자월드' 등 표기를 「태국에, 살자」 계열로 갱신 (이미 적용된 과거 마이그레이션은 수정하지 않음)

begin;

update public.knowledge_sources
set name = replace(name, '태자월드 —', '태국에, 살자 —')
where name like '%태자월드%';

update public.chat_rooms
set description = '태국에, 살자 기본 커뮤니티 채팅'
where description = '태자월드 기본 채팅방';

update public.local_businesses
set description = '태국에, 살자 데모 로컬 맛집 — 포털이 비었을 때만 노출됩니다.'
where slug = 'bangkok-quick-bites'
  and description like '%태자월드%';

commit;
