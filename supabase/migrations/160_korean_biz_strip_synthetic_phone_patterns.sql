-- 159(taeja_seed/sh) 이후: 숫자 패턴만으로 남은 데모·가짜 번호 행 추가 정화
-- 앱의 isLikelySyntheticOrDemoPhone 와 동등한 휴리스틱 (정규식)

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
