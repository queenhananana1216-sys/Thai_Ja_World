-- 한인 생활망 휴먼-인-더-루프: Places 감사 제안 큐 (원본 행은 승인 전까지 유지)
create table if not exists public.biz_update_proposals (
  id uuid primary key default gen_random_uuid(),
  korean_business_id uuid not null references public.korean_businesses (id) on delete cascade,
  audit_batch_id uuid not null,
  proposal_kind text not null,
  current_value text,
  proposed_value text,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'google_places',
  witty_headline text,
  witty_sub text,
  status text not null default 'pending'
    check (status in ('pending', 'applied', 'rejected', 'dismissed')),
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  applied_by_profile_id uuid references public.profiles (id) on delete set null
);

create index if not exists idx_biz_update_proposals_pending
  on public.biz_update_proposals (status, created_at desc);

create index if not exists idx_biz_update_proposals_business
  on public.biz_update_proposals (korean_business_id, created_at desc);

create unique index if not exists ux_biz_update_proposals_one_pending_kind
  on public.biz_update_proposals (korean_business_id, proposal_kind)
  where status = 'pending';

comment on table public.biz_update_proposals is
  'biz-radar-audit: Google Places 대조 불일치 시 제안만 적재 — 오너 승인 후 korean_businesses 반영';

alter table public.biz_update_proposals enable row level security;
