-- 한인 생활망: 연락 채널 컬럼 보장(157과 동일 DDL) → 그 다음 시드(taeja_seed_*) 정화
-- 원격에서 157이 누락돼도 본 파일 단독 실행 시 42703 방지. 단일 마이그레이션 트랜잭션 내 순서 고정.

alter table if exists public.korean_businesses
  add column if not exists line_url text,
  add column if not exists whatsapp_url text,
  add column if not exists contact_checked_at timestamptz,
  add column if not exists contact_link_ok boolean;

comment on column public.korean_businesses.line_url is '공개 LINE 채팅/오픈채팅 URL (https://line.me/...)';
comment on column public.korean_businesses.whatsapp_url is 'WhatsApp 대화 링크 (https://wa.me/...)';
comment on column public.korean_businesses.contact_checked_at is 'Contact-Check-Bot 마지막 HTTP 점검 시각';
comment on column public.korean_businesses.contact_link_ok is 'true: 링크 응답 정상, false: 끊김·오류, null: 미검사';

-- 시드·자가치유용 행: 가상 번호·플레이스홀더 채널 제거 → UI는 "실제 연락처 확인 중"
update public.korean_businesses
set
  phone = null,
  line_url = null,
  whatsapp_url = null,
  contact_link_ok = null,
  contact_checked_at = null,
  is_verified = false
where google_place_id ~* '^taeja_(seed|sh)_';

notify pgrst, 'reload_schema';
