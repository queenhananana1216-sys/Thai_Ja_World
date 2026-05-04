-- =============================================================================
-- 156_ghost_vitality_personas.sql
-- 고스트 활력: 고스트라이터 글에 서로 다른 가상 계정으로 공감·댓글 시드 시 사용
--   id = 00000000-0000-0000-0000-000000000002..004 (앱: src/lib/cron/ghostVitalityPersonas.ts)
-- =============================================================================

begin;

create extension if not exists pgcrypto;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  is_sso_user, is_anonymous
)
select
  '00000000-0000-0000-0000-000000000002'::uuid,
  coalesce((select u.instance_id from auth.users u limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  'authenticated', 'authenticated',
  'vitality-bot-a@taeja.world',
  crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('display_name', '방콕 커뮤니티 A'),
  now(), now(), '', '', '', '', false, false
where not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000002');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  is_sso_user, is_anonymous
)
select
  '00000000-0000-0000-0000-000000000003'::uuid,
  coalesce((select u.instance_id from auth.users u limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  'authenticated', 'authenticated',
  'vitality-bot-b@taeja.world',
  crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('display_name', '파타야 드라이버 B'),
  now(), now(), '', '', '', '', false, false
where not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000003');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  is_sso_user, is_anonymous
)
select
  '00000000-0000-0000-0000-000000000004'::uuid,
  coalesce((select u.instance_id from auth.users u limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  'authenticated', 'authenticated',
  'vitality-bot-c@taeja.world',
  crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('display_name', 'CM 꿀팁러 C'),
  now(), now(), '', '', '', '', false, false
where not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000004');

insert into public.profiles (id, display_name, locale, admin_search) values
  ('00000000-0000-0000-0000-000000000002', '방콕 커뮤니티 A', 'ko', ''),
  ('00000000-0000-0000-0000-000000000003', '파타야 드라이버 B', 'ko', ''),
  ('00000000-0000-0000-0000-000000000004', 'CM 꿀팁러 C', 'ko', '')
on conflict (id) do update set
  display_name = excluded.display_name,
  locale = excluded.locale;

commit;
