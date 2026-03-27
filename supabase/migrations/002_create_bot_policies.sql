-- =============================================================
-- Migration: 002_create_bot_policies
-- Description: 봇 정책 관리 테이블 (Phase 3 준비)
-- =============================================================
-- 적용 시점: Phase 3 UI 기반 정책 관리 구현 시
-- Phase 2 현재: BOT_POLICY_MODE 환경 변수로 충분히 대체됨
--
-- 적용 방법:
--   Option A) Supabase 대시보드 → SQL 에디터에 붙여넣기
--   Option B) supabase db push (supabase CLI 사용 시)
-- =============================================================

create table if not exists public.bot_policies (
  id               uuid        primary key default gen_random_uuid(),

  -- 정책 모드: 'auto' = 인시던트 자동 처리, 'manual' = 사람 검토 필요
  policy_mode      text        not null
                               check (policy_mode in ('auto', 'manual'))
                               default 'manual',

  -- 자동 heal 을 발동하는 연속 실패 횟수 임계값
  heal_threshold   int         not null default 3 check (heal_threshold > 0),

  -- 봇이 자동으로 수행 가능한 action_type 목록
  -- 예: '["heal","alert"]'::jsonb
  allowed_actions  jsonb       not null
                               default '["heal","alert"]'::jsonb,

  description      text,

  -- 활성 정책 여부 (여러 정책 중 하나만 is_active = true 를 권장)
  is_active        boolean     not null default true,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- updated_at 자동 갱신 트리거 함수
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_bot_policies_updated_at
  before update on public.bot_policies
  for each row execute function public.update_updated_at_column();

-- 기본 보수적 정책 행
insert into public.bot_policies (
  policy_mode,
  heal_threshold,
  allowed_actions,
  description
) values (
  'manual',
  3,
  '["heal","alert"]'::jsonb,
  '기본 정책 — Phase 3 에서 Bot Console UI 로 관리 예정'
) on conflict do nothing;

create index if not exists idx_bot_policies_is_active
  on public.bot_policies (is_active);

-- RLS: 클라이언트(anon/authenticated) 차단 — 봇/관리는 service_role (RLS 우회, lint 0008)
alter table public.bot_policies enable row level security;

drop policy if exists bot_policies_no_client_access on public.bot_policies;
create policy bot_policies_no_client_access on public.bot_policies
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- =============================================================
-- Phase 2 → Phase 3 마이그레이션 가이드:
--
-- 1. 이 파일을 실행하여 bot_policies 테이블 생성
-- 2. src/bots/adapters/supabaseClient.ts 의 `getServerSupabaseClient()`
--    에서 Database 제네릭 타입을 supabase gen types 결과로 교체
-- 3. src/bots/actions/selfHeal.ts 의 BOT_POLICY_MODE 판단 로직을
--    bot_policies 테이블 조회 (is_active=true 행) 로 교체
-- 4. 환경 변수 BOT_POLICY_MODE 는 DB 설정의 fallback 으로 유지
-- =============================================================
