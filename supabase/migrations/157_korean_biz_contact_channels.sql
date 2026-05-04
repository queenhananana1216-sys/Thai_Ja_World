-- 한인 업소 공개 채널(라인·왓츠앱) + Contact-Check-Bot 결과
alter table if exists public.korean_businesses
  add column if not exists line_url text,
  add column if not exists whatsapp_url text,
  add column if not exists contact_checked_at timestamptz,
  add column if not exists contact_link_ok boolean;

comment on column public.korean_businesses.line_url is '공개 LINE 채팅/오픈채팅 URL (https://line.me/...)';
comment on column public.korean_businesses.whatsapp_url is 'WhatsApp 대화 링크 (https://wa.me/...)';
comment on column public.korean_businesses.contact_checked_at is 'Contact-Check-Bot 마지막 HTTP 점검 시각';
comment on column public.korean_businesses.contact_link_ok is 'true: 링크 응답 정상, false: 끊김·오류, null: 미검사';
