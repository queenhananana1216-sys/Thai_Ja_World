-- 유저 제보 한인 업소 — 관리자 검토 후 `korean_businesses` 반영(수동·크론)
-- PostgREST: NOTIFY pgrst, 'reload_schema';

create table if not exists public.korean_biz_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 1 and char_length(name) <= 300),
  address text check (address is null or char_length(address) <= 800),
  phone text check (phone is null or char_length(phone) <= 80),
  suggested_category public.korean_biz_category,
  suggested_region public.korean_biz_region not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'merged')),
  submitter_note text check (submitter_note is null or char_length(submitter_note) <= 1000),
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  submitted_by uuid references auth.users (id) on delete set null
);

create index if not exists korean_biz_submissions_status_created_idx
  on public.korean_biz_submissions (status, created_at desc);

comment on table public.korean_biz_submissions is '한인 생활망 업소 제보 — 쓰기는 서버 API(service_role)만';

alter table public.korean_biz_submissions enable row level security;

notify pgrst, 'reload_schema';
