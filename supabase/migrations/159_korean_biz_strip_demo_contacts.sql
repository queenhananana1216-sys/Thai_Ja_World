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
