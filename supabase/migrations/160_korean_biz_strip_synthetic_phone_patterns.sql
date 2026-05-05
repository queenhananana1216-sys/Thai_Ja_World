-- 159(taeja_seed/sh) 이후: 숫자 패턴만으로 남은 데모·가짜 번호 행 추가 정화
-- 앱의 isLikelySyntheticOrDemoPhone 와 동등한 휴리스틱 (정규식)
-- DDL 선행(159와 동일 패턴) — 157/159 누락 원격에서도 160 단독 적용 가능

alter table if exists public.korean_businesses
  add column if not exists line_url text,
  add column if not exists whatsapp_url text,
  add column if not exists contact_checked_at timestamptz,
  add column if not exists contact_link_ok boolean;

comment on column public.korean_businesses.line_url is '공개 LINE 채팅/오픈채팅 URL (https://line.me/...)';
comment on column public.korean_businesses.whatsapp_url is 'WhatsApp 대화 링크 (https://wa.me/...)';
comment on column public.korean_businesses.contact_checked_at is 'Contact-Check-Bot 마지막 HTTP 점검 시각';
comment on column public.korean_businesses.contact_link_ok is 'true: 링크 응답 정상, false: 끊김·오류, null: 미검사';

update public.korean_businesses
set
  phone = null,
  line_url = null,
  whatsapp_url = null,
  contact_link_ok = null,
  contact_checked_at = null,
  is_verified = false
where phone is not null
  and (
    regexp_replace(coalesce(phone, ''), '\D', '', 'g') ~ '0{4,}'
    or regexp_replace(coalesce(phone, ''), '\D', '', 'g') ~ '^(\d)\1{8,}$'
    or regexp_replace(coalesce(phone, ''), '\D', '', 'g') ~ '^668100010\d{2}$'
    or regexp_replace(coalesce(phone, ''), '\D', '', 'g') ~ '^668200020\d{2}$'
    or regexp_replace(coalesce(phone, ''), '\D', '', 'g') ~ '\d000\d{4}'
    or regexp_replace(coalesce(phone, ''), '\D', '', 'g') ~ '000\d{4}$'
  );

notify pgrst, 'reload_schema';
