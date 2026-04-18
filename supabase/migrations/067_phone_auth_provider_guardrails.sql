-- 067_phone_auth_provider_guardrails.sql
-- Phone OTP request logs for provider guardrails

create table if not exists public.phone_otp_requests (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  ip_hash text not null,
  provider text not null check (provider in ('supabase', 'twilio')),
  created_at timestamptz not null default now()
);

comment on table public.phone_otp_requests is
  'Phone OTP send logs for cooldown and rate limits. Service role only.';

create index if not exists phone_otp_requests_phone_idx
  on public.phone_otp_requests (phone_e164, created_at desc);

create index if not exists phone_otp_requests_ip_idx
  on public.phone_otp_requests (ip_hash, created_at desc);

alter table public.phone_otp_requests enable row level security;

drop policy if exists "phone_otp_requests_no_access" on public.phone_otp_requests;
create policy "phone_otp_requests_no_access"
  on public.phone_otp_requests
  for all
  to anon, authenticated
  using (false)
  with check (false);
-- 067_phone_auth_provider_guardrails.sql
-- KR/TH 중심 문자 OTP 가드레일 로그 (provider 추상화용)

create table if not exists public.phone_otp_requests (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  ip_hash text not null,
  provider text not null check (provider in ('supabase', 'twilio')),
  created_at timestamptz not null default now()
);

comment on table public.phone_otp_requests is
  '문자 OTP 발송 이력(쿨다운/레이트리밋). 서비스 롤 전용.';

create index if not exists phone_otp_requests_phone_idx
  on public.phone_otp_requests (phone_e164, created_at desc);

create index if not exists phone_otp_requests_ip_idx
  on public.phone_otp_requests (ip_hash, created_at desc);

alter table public.phone_otp_requests enable row level security;

drop policy if exists "phone_otp_requests_no_access" on public.phone_otp_requests;
create policy "phone_otp_requests_no_access"
  on public.phone_otp_requests
  for all
  to anon, authenticated
  using (false)
  with check (false);
