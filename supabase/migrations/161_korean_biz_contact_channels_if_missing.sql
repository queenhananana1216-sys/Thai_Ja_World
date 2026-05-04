-- 157과 동일 — 원격 DB에 157이 빠져 159/160 실행 시 42703 나는 경우용 idempotent 보강
-- (마이그레이션 순서가 어긋났거나 SQL 에디터에서 159만 붙여넣은 경우)

alter table if exists public.korean_businesses
  add column if not exists line_url text,
  add column if not exists whatsapp_url text,
  add column if not exists contact_checked_at timestamptz,
  add column if not exists contact_link_ok boolean;

comment on column public.korean_businesses.line_url is '공개 LINE 채팅/오픈채팅 URL (https://line.me/...)';
comment on column public.korean_businesses.whatsapp_url is 'WhatsApp 대화 링크 (https://wa.me/...)';
comment on column public.korean_businesses.contact_checked_at is 'Contact-Check-Bot 마지막 HTTP 점검 시각';
comment on column public.korean_businesses.contact_link_ok is 'true: 링크 응답 정상, false: 끊김·오류, null: 미검사';

notify pgrst, 'reload_schema';
