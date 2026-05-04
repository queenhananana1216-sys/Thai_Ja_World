-- =============================================================================
-- 156_posts_processed_knowledge_ai_insight.sql
-- 커뮤니티 posts · 꿀팁 processed_knowledge 에 AI 부가 인사이트(jsonb) 저장.
-- 원문(title/content, clean_body)은 앱 계약상 변경하지 않고 ai_insight 만 갱신.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) 컬럼 추가
-- ---------------------------------------------------------------------------
alter table public.posts
  add column if not exists ai_insight jsonb null;

comment on column public.posts.ai_insight is
  'schema_version=1, raw_llm(평탄 LLM 출력), display(뉴스 clean_body 와 유사한 정규화 JSON). title/content 는 유저 원문 — 여기 요약은 AI 한마디 전용.';

alter table public.processed_knowledge
  add column if not exists ai_insight jsonb null;

comment on column public.processed_knowledge.ai_insight is
  '지식/비자 파이프라인용 AI 부가 인사이트. clean_body 본편은 유지하고 목록·상세의 뱃지·한마디 블록에만 사용.';

-- ---------------------------------------------------------------------------
-- 2) posts.ai_insight — 클라이언트 역할이 직접 수정하지 못하도록 방어
--    (SELECT 는 기존 posts_select_readable 로 ai_insight 포함 조회 가능)
--    PostgREST service_role JWT 의 role 이 service_role 일 때만 갱신 허용.
-- ---------------------------------------------------------------------------
create or replace function public.posts_guard_ai_insight_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.ai_insight is not distinct from old.ai_insight then
    return new;
  end if;
  if jwt_role = 'service_role' then
    return new;
  end if;
  raise exception 'posts.ai_insight is service_role only'
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_posts_guard_ai_insight on public.posts;
create trigger trg_posts_guard_ai_insight
  before update of ai_insight on public.posts
  for each row
  execute function public.posts_guard_ai_insight_mutation();

create or replace function public.processed_knowledge_guard_ai_insight_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.ai_insight is not distinct from old.ai_insight then
    return new;
  end if;
  if jwt_role = 'service_role' then
    return new;
  end if;
  raise exception 'processed_knowledge.ai_insight is service_role only'
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_processed_knowledge_guard_ai_insight on public.processed_knowledge;
create trigger trg_processed_knowledge_guard_ai_insight
  before update of ai_insight on public.processed_knowledge
  for each row
  execute function public.processed_knowledge_guard_ai_insight_mutation();

comment on function public.posts_guard_ai_insight_mutation() is
  'ai_insight 컬럼 갱신은 service_role(JWT)만 허용 — 일반 세션의 UPDATE 차단.';

comment on function public.processed_knowledge_guard_ai_insight_mutation() is
  'ai_insight 컬럼 갱신은 service_role(JWT)만 허용.';

commit;
