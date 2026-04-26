-- =============================================================================
-- 096_spline_scenes.sql
-- 태자월드 랜딩·전역 Spline 3D 장면 슬롯(로고/히어로/악센트 4개) 파이프라인 테이블.
--
-- 왜 테이블로 두나:
--   - 에디터 파일 ID(app.spline.design/file/<uuid>) 는 임베드 불가 → 퍼블리시 후 URL 교체 필요.
--   - 퍼블리시/비퍼블리시 토글, 품질 티어(저사양 모바일 skip), 배치 힌트를 운영에서 바꾸고 싶다.
--   - Vercel 환경변수만 쓰면 재배포가 필요하므로, 무중단 교체를 위해 DB 우선 조회 + ENV 폴백 구조.
-- =============================================================================

create table if not exists public.spline_scenes (
  slot            text primary key,
  source_file_id  text,
  published_url   text,
  scene_code_url  text,
  is_enabled      boolean not null default true,
  quality_tier    text not null default 'high'
                  check (quality_tier in ('low', 'medium', 'high')),
  placement_hint  text,
  updated_at      timestamptz not null default now()
);

comment on table public.spline_scenes is
  '랜딩·전역 Spline 3D 슬롯 6종 (logo / hero / accent1~4). 퍼블리시 URL 없으면 런타임 플레이스홀더로 폴백.';
comment on column public.spline_scenes.slot           is 'logo / hero / accent1 / accent2 / accent3 / accent4';
comment on column public.spline_scenes.source_file_id is 'app.spline.design/file/<uuid> — 에디터 파일 ID (운영 추적용)';
comment on column public.spline_scenes.published_url  is 'https://my.spline.design/<slug>/ — iframe 임베드용 공개 URL';
comment on column public.spline_scenes.scene_code_url is 'https://prod.spline.design/<hash>/scene.splinecode — React 컴포넌트용';
comment on column public.spline_scenes.placement_hint is '배치 설명(사람용) — 예: nav-left-logo, landing-hero-background';

-- updated_at 자동 갱신
create or replace function public.spline_scenes_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_spline_scenes_updated_at on public.spline_scenes;
create trigger trg_spline_scenes_updated_at
  before update on public.spline_scenes
  for each row execute function public.spline_scenes_set_updated_at();

-- 공개 읽기만 허용 (운영자는 service role 로 update)
alter table public.spline_scenes enable row level security;

drop policy if exists "spline_scenes public read" on public.spline_scenes;
create policy "spline_scenes public read"
  on public.spline_scenes
  for select
  using (true);

-- 초기 시드: 사용자 제공 편집 파일 ID 를 6슬롯에 매핑. published_url 은 Publish 후 주입.
insert into public.spline_scenes (slot, source_file_id, is_enabled, quality_tier, placement_hint)
values
  ('logo',    '64ae0a21-6e2b-4f59-8f13-e0e8cd9913ff', true, 'high',   'global-nav-left-logo'),
  ('hero',    'b3827bf1-ff8a-4d88-ad23-e868370705b6', true, 'high',   'landing-hero-background'),
  ('accent1', '8638023d-8959-4e3d-bf50-071491fd7fd8', true, 'medium', 'landing-entry-flow-accent'),
  ('accent2', 'bfd8e621-fb84-4293-8a5f-cb5ac6b4ba3b', true, 'medium', 'landing-problem-accent'),
  ('accent3', 'bfb41b7e-be1e-477e-839b-55bc1f28e071', true, 'medium', 'landing-testimonial-accent'),
  ('accent4', '0722afe0-7e97-416b-bd5a-fdf7528f40f0', true, 'medium', 'landing-cta-accent')
on conflict (slot) do update
  set source_file_id = excluded.source_file_id,
      placement_hint = excluded.placement_hint,
      updated_at     = now();
