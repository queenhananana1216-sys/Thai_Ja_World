-- =============================================================================
-- bestvip77: OTP request guardrails (cooldown / rate limit)
-- =============================================================================

create table if not exists public.bestvip77_phone_otp_requests (
  id bigserial primary key,
  phone_e164 text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

comment on table public.bestvip77_phone_otp_requests is
  'bestvip77 휴대폰 OTP 요청 로그(쿨다운/요청 제한용).';

create index if not exists bestvip77_phone_otp_requests_phone_idx
  on public.bestvip77_phone_otp_requests (phone_e164, created_at desc);

create index if not exists bestvip77_phone_otp_requests_ip_idx
  on public.bestvip77_phone_otp_requests (ip_hash, created_at desc);

alter table public.bestvip77_phone_otp_requests enable row level security;

drop policy if exists "bestvip77_phone_otp_requests_no_access" on public.bestvip77_phone_otp_requests;
create policy "bestvip77_phone_otp_requests_no_access"
  on public.bestvip77_phone_otp_requests
  for all
  to authenticated, anon
  using (false)
  with check (false);
