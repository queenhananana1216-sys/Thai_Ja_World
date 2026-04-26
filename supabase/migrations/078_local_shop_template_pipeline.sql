-- ============================================================
-- 092_local_shop_template_pipeline.sql
-- 로컬샵 메뉴판/가격표 이미지 기반 템플릿 초안 파이프라인
-- 업로드 자산 -> 템플릿 초안 -> 관리자 승인/거절 -> 적용/롤백 로그
-- ============================================================

create table if not exists public.local_spot_menu_assets (
  id uuid primary key default gen_random_uuid(),
  local_spot_id uuid not null references public.local_spots(id) on delete cascade,
  asset_type text not null
    check (asset_type in ('menu_board', 'price_list', 'treatment_sheet')),
  storage_path text not null,
  public_url text not null,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'queued', 'processing', 'processed', 'failed')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  ocr_text text,
  extracted_menu jsonb not null default '[]'::jsonb,
  style_profile jsonb not null default '{}'::jsonb,
  pipeline_meta jsonb not null default '{}'::jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.local_spot_menu_assets is '로컬샵 메뉴판/가격표/시술표 이미지 자산 + 파이프라인 처리 결과';
comment on column public.local_spot_menu_assets.extracted_menu is 'OCR/비전으로 추출한 구조화 메뉴 배열(JSON)';
comment on column public.local_spot_menu_assets.style_profile is '색상/톤/컨셉 추출 프로필(JSON)';
comment on column public.local_spot_menu_assets.pipeline_meta is '신뢰도/모델/재시도/큐 정보(JSON)';

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'local_spot_menu_assets'
      and c.conname = 'local_spot_menu_assets_extracted_menu_array'
  ) then
    alter table public.local_spot_menu_assets
      add constraint local_spot_menu_assets_extracted_menu_array
      check (jsonb_typeof(extracted_menu) = 'array');
  end if;
end $$;

drop trigger if exists trg_local_spot_menu_assets_updated_at on public.local_spot_menu_assets;
create trigger trg_local_spot_menu_assets_updated_at
  before update on public.local_spot_menu_assets
  for each row execute function public.set_updated_at();

create index if not exists local_spot_menu_assets_spot_idx
  on public.local_spot_menu_assets (local_spot_id, created_at desc);
create index if not exists local_spot_menu_assets_status_idx
  on public.local_spot_menu_assets (status, created_at asc);

alter table public.local_spot_menu_assets enable row level security;

drop policy if exists local_spot_menu_assets_owner_select on public.local_spot_menu_assets;
create policy local_spot_menu_assets_owner_select
  on public.local_spot_menu_assets for select
  to authenticated
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id = auth.uid()
    )
  );

drop policy if exists local_spot_menu_assets_owner_insert on public.local_spot_menu_assets;
create policy local_spot_menu_assets_owner_insert
  on public.local_spot_menu_assets for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1
      from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id = auth.uid()
    )
  );

create table if not exists public.local_spot_template_drafts (
  id uuid primary key default gen_random_uuid(),
  local_spot_id uuid not null references public.local_spots(id) on delete cascade,
  source_asset_ids uuid[] not null default '{}',
  style_profile_json jsonb not null default '{}'::jsonb,
  template_json jsonb not null default '{}'::jsonb,
  confidence numeric(5,2) not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'rejected', 'applied')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_by uuid references public.profiles(id) on delete set null,
  snapshot_before jsonb not null default '{}'::jsonb,
  pipeline_meta jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.local_spot_template_drafts is '로컬샵 이미지 분석으로 생성된 미니홈 템플릿 초안';
comment on column public.local_spot_template_drafts.template_json is 'local_spots 미니홈 필드에 매핑 가능한 템플릿 JSON';
comment on column public.local_spot_template_drafts.snapshot_before is '적용 직전 local_spots 스냅샷(롤백 용도)';

drop trigger if exists trg_local_spot_template_drafts_updated_at on public.local_spot_template_drafts;
create trigger trg_local_spot_template_drafts_updated_at
  before update on public.local_spot_template_drafts
  for each row execute function public.set_updated_at();

create index if not exists local_spot_template_drafts_spot_idx
  on public.local_spot_template_drafts (local_spot_id, created_at desc);
create index if not exists local_spot_template_drafts_status_idx
  on public.local_spot_template_drafts (status, created_at asc);

alter table public.local_spot_template_drafts enable row level security;

drop policy if exists local_spot_template_drafts_owner_select on public.local_spot_template_drafts;
create policy local_spot_template_drafts_owner_select
  on public.local_spot_template_drafts for select
  to authenticated
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id = auth.uid()
    )
  );

create table if not exists public.local_spot_template_audits (
  id uuid primary key default gen_random_uuid(),
  local_spot_id uuid not null references public.local_spots(id) on delete cascade,
  draft_id uuid references public.local_spot_template_drafts(id) on delete set null,
  action text not null
    check (action in ('create_draft', 'approve', 'reject', 'apply', 'rollback', 'pipeline_error')),
  actor_id uuid references public.profiles(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.local_spot_template_audits is '로컬샵 템플릿 승인/적용/롤백 감사 로그';

create index if not exists local_spot_template_audits_spot_idx
  on public.local_spot_template_audits (local_spot_id, created_at desc);
create index if not exists local_spot_template_audits_draft_idx
  on public.local_spot_template_audits (draft_id, created_at desc);

alter table public.local_spot_template_audits enable row level security;

drop policy if exists local_spot_template_audits_owner_select on public.local_spot_template_audits;
create policy local_spot_template_audits_owner_select
  on public.local_spot_template_audits for select
  to authenticated
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = local_spot_id
        and s.owner_profile_id = auth.uid()
    )
  );
