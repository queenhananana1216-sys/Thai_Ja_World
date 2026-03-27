-- =============================================================================
-- 029_minihome_intro_layout_modules — 미니홈 메인룸 글 + 블록 순서(확장용)
-- =============================================================================
-- - intro_body: 플레인텍스트 소개(메인룸). 리치텍스트는 추후 별도 컬럼/버전.
-- - layout_modules: JSON 배열 — 렌더 순서. 예: ["intro","guestbook","photos"]
--   이후 "diary", "music", "guestbook" 등 id만 추가하면 프론트·API 확장 가능.
-- =============================================================================

alter table public.user_minihomes
  add column if not exists intro_body text,
  add column if not exists layout_modules jsonb not null default '["intro","guestbook","photos"]'::jsonb;

comment on column public.user_minihomes.intro_body is '미니홈 메인룸 소개(플레인텍스트).';
comment on column public.user_minihomes.layout_modules is '미니홈 블록 렌더 순서 문자열 배열. 스키마 확장 시 앱과 함께 문서화.';

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'user_minihomes' and c.conname = 'user_minihomes_intro_len'
  ) then
    alter table public.user_minihomes
      add constraint user_minihomes_intro_len
      check (intro_body is null or char_length(intro_body) <= 6000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'user_minihomes' and c.conname = 'user_minihomes_layout_modules_array'
  ) then
    alter table public.user_minihomes
      add constraint user_minihomes_layout_modules_array
      check (jsonb_typeof(layout_modules) = 'array');
  end if;
end $$;
