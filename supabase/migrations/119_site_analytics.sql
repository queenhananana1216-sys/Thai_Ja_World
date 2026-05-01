-- PHASE 2: 클라이언트 트래픽 이벤트 (체류·클릭·뷰) — 서비스 롤 API로만 삽입 권장
create table if not exists public.site_analytics (
  id uuid primary key default gen_random_uuid(),
  recorded_at timestamptz not null default now(),
  kind text not null check (kind in ('view', 'click', 'dwell')),
  route text not null default '/',
  dwell_ms int,
  session_id text,
  meta jsonb not null default '{}'::jsonb
);

comment on table public.site_analytics is '공개 사이트 행동 로그 — 어드민 집계용. 직접 INSERT 정책 없음(앱 API 경유).';

create index if not exists site_analytics_recorded_at_idx on public.site_analytics (recorded_at desc);
create index if not exists site_analytics_kind_idx on public.site_analytics (kind);
create index if not exists site_analytics_session_idx on public.site_analytics (session_id);

alter table public.site_analytics enable row level security;

drop policy if exists "site_analytics_select_service" on public.site_analytics;
-- 서비스 롤은 RLS 우회 — 읽기는 관리자·집계 API에서만 service role 사용
drop policy if exists "site_analytics_no_public" on public.site_analytics;
create policy "site_analytics_no_public"
  on public.site_analytics
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- health.safe_mode (118번 마이그레이션 선행 가정 — 없으면 이 INSERT는 스킵 불가이므로 프로젝트는 118 후 적용)
insert into public.site_settings (key, value)
values ('health.safe_mode', 'false'::jsonb)
on conflict (key) do nothing;
