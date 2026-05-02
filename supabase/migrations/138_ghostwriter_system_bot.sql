-- =============================================================================
-- 138_ghostwriter_system_bot.sql
-- 고스트라이터(cron/auto-content) · Shadow QA용 시스템 봇 계정
--   id = 00000000-0000-0000-0000-000000000001  (앱: src/lib/cron/ghostwriterBot.ts)
-- auth.users INSERT 시 handle_new_user → profiles + user_minihomes 자동 생성
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- instance_id: 기존 유저와 동일(빈 DB면 Supabase 기본 nil UUID)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  is_sso_user,
  is_anonymous
)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  coalesce((select u.instance_id from auth.users u limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  'authenticated',
  'authenticated',
  'bot@taeja.world',
  crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('display_name', '태국에, 살자 운영진'),
  now(),
  now(),
  '',
  '',
  '',
  '',
  false,
  false
where not exists (
  select 1 from auth.users where id = '00000000-0000-0000-0000-000000000001'
);

-- 트리거가 이미 profile 을 넣었어도 표시명 정합 (admin_search 는 이후 UPDATE 트리거가 보강 가능)
insert into public.profiles (id, display_name, locale, admin_search)
values (
  '00000000-0000-0000-0000-000000000001',
  '태국에, 살자 운영진',
  'ko',
  ''
)
on conflict (id) do update set
  display_name = excluded.display_name,
  locale = excluded.locale;

commit;
