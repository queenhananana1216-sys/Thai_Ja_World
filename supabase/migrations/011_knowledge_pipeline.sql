-- ============================================================
-- 011_knowledge_pipeline.sql
-- 지식 컨텐츠 파이프라인 (수집 → 가공 → 관리자 승인 → 공개)
-- 뉴스 파이프라인(raw_news / processed_news / summaries)과 동일한 설계 철학
-- ============================================================

-- ── 1. knowledge_sources ──────────────────────────────────────────────────
-- 수집 소스 목록 (RSS, URL 목록, 검색쿼리 기반 RSS 등)

create table if not exists public.knowledge_sources (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  kind         text        not null check (kind in ('rss', 'url_list', 'search_rss')),
  rss_url      text        null,
  url_list_json jsonb      null,
  search_query text        null,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now()
);

comment on table  public.knowledge_sources is '비자/꿀팁 콘텐츠 수집 소스 (RSS·URL리스트·구글RSS검색)';
comment on column public.knowledge_sources.kind is 'rss | url_list | search_rss';
comment on column public.knowledge_sources.url_list_json is 'kind=url_list 일 때 [{url, label}] 형태 jsonb';
comment on column public.knowledge_sources.search_query is 'kind=search_rss 일 때 Google News RSS 검색어';

-- ── 2. raw_knowledge ─────────────────────────────────────────────────────
-- 수집된 원문 메타데이터 + 최소 발췌 (저작권: 원문 그대로 대량 저장 금지)

create table if not exists public.raw_knowledge (
  id             uuid        primary key default gen_random_uuid(),
  source_id      uuid        references public.knowledge_sources(id) on delete set null,
  external_url   text        not null unique, -- canonical/normalized 기준 중복 방지
  title_original text        null,
  raw_body       text        null,            -- 요약에 필요한 최소 발췌만 (길이 제한 강제)
  fetched_at     timestamptz not null default now(),
  published_at   timestamptz null,
  content_hash   text        null             -- 중복 감지 보조
);

comment on table  public.raw_knowledge is '수집된 지식 컨텐츠 원문 메타데이터 (저작권: 원문 최소 발췌만 저장)';
comment on column public.raw_knowledge.external_url is 'canonical URL — unique 제약으로 중복 수집 방지';
comment on column public.raw_knowledge.raw_body is '요약에 필요한 최소 발췌. 과도한 원문 복사 금지. 길이 제한 적용';

create index if not exists raw_knowledge_source_id_idx on public.raw_knowledge(source_id);
create index if not exists raw_knowledge_fetched_at_idx on public.raw_knowledge(fetched_at desc);

-- ── 3. processed_knowledge ───────────────────────────────────────────────
-- LLM 가공 결과 (JSON 구조화 저장). 뉴스의 processed_news 와 동일 역할.

create table if not exists public.processed_knowledge (
  id                  uuid        primary key default gen_random_uuid(),
  raw_knowledge_id    uuid        not null references public.raw_knowledge(id) on delete cascade,
  clean_body          jsonb       null,          -- LLM 출력 구조화 JSON
  language_default    text        not null default 'ko',
  board_target        text        not null default 'board_board'
                        check (board_target in ('tips_board', 'board_board')),
  published           boolean     not null default false,
  created_at          timestamptz not null default now()
);

comment on table  public.processed_knowledge is 'LLM 구조화 결과. published=false 이면 관리자 승인 대기 초안.';
comment on column public.processed_knowledge.board_target is 'tips_board(꿀팁) | board_board(비자·가이드·혼합)';
comment on column public.processed_knowledge.published is
  'true: 공개 보드 노출. false: 관리자 승인 대기 초안(KNOWLEDGE_PUBLISH_MODE=manual 시 기본값).';
comment on column public.processed_knowledge.clean_body is
  'LLM strict JSON: board_target, editorial_meta, ko{title,summary,checklist,cautions,tags}, th{...}, board_copy, sources[]';

create unique index if not exists processed_knowledge_raw_id_uniq
  on public.processed_knowledge(raw_knowledge_id);

create index if not exists processed_knowledge_published_idx
  on public.processed_knowledge(published, created_at desc);

create index if not exists processed_knowledge_board_target_idx
  on public.processed_knowledge(board_target, published, created_at desc);

-- ── 4. knowledge_summaries ───────────────────────────────────────────────
-- 뉴스의 summaries 와 동일한 구조. model 컬럼으로 ko/th 구분.

create table if not exists public.knowledge_summaries (
  id                     uuid        primary key default gen_random_uuid(),
  processed_knowledge_id uuid        not null references public.processed_knowledge(id) on delete cascade,
  summary_text           text        not null,
  model                  text        null -- 'ko' | 'th'
);

comment on table public.knowledge_summaries is '지식 컨텐츠 요약문. model=ko|th 로 언어 구분.';

create index if not exists knowledge_summaries_pk_id_idx
  on public.knowledge_summaries(processed_knowledge_id);

-- ── RLS 정책 ────────────────────────────────────────────────────────────

-- knowledge_sources (관리·파이프라인 전용 — API 클라이언트 차단, lint 0008)
alter table public.knowledge_sources enable row level security;

drop policy if exists knowledge_sources_no_client_access on public.knowledge_sources;
create policy knowledge_sources_no_client_access on public.knowledge_sources
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- raw_knowledge (공개 읽기 허용 — 출처 URL 노출용)
alter table public.raw_knowledge enable row level security;
create policy "raw_knowledge: public read"
  on public.raw_knowledge for select
  using (true);

-- processed_knowledge (공개 읽기는 published=true 만)
alter table public.processed_knowledge enable row level security;
create policy "processed_knowledge: public read published"
  on public.processed_knowledge for select
  using (published = true);

-- knowledge_summaries (공개 읽기 허용 — 요약 노출용)
alter table public.knowledge_summaries enable row level security;
create policy "knowledge_summaries: public read"
  on public.knowledge_summaries for select
  using (true);

-- ── 기본 소스 시드 데이터 ─────────────────────────────────────────────────
-- 태국 비자/생활 관련 Google News RSS (search_rss 방식)

insert into public.knowledge_sources (name, kind, search_query, is_active) values
  ('태국 비자 정보 (한국어RSS)', 'search_rss', '태국 비자 장기비자 연장 서류', true),
  ('태국 생활 꿀팁 (한국어RSS)', 'search_rss', '태국 생활 꿀팁 교민 정보', true),
  ('태국 입국 출국 정보 (한국어RSS)', 'search_rss', '태국 입국 출국 여행자 주의사항', true)
on conflict do nothing;
