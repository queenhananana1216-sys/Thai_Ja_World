-- =============================================================================
-- PHASE 2 — 비회원(anon) 티저용 공개 SELECT 보강
-- 참고: 128_* 파일명은 이미 local_minihomes 용도로 사용 중이라 130 으로 번호 부여.
-- 기존 정책과 병렬 시 Postgres RLS 는 OR 이므로, 더 넓은 정책이 남아 있으면 비공개 행도
-- 보일 수 있습니다. 운영 DB 에서 legacy permissive 정책이 있다면 별도 정리 권장.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- GRANT (테이블 단위 읽기 권한 — 정책과 함께 필요)
-- ---------------------------------------------------------------------------
grant select on public.board_posts to anon;
grant select on public.processed_news to anon;
grant select on public.local_minihomes to anon;
grant select on public.local_menus to anon;

-- ---------------------------------------------------------------------------
-- board_posts — 비회원 피드 티저
-- ---------------------------------------------------------------------------
drop policy if exists ph2_board_posts_anon_select on public.board_posts;
create policy ph2_board_posts_anon_select on public.board_posts
  for select
  to anon
  using (true);

-- ---------------------------------------------------------------------------
-- processed_news — 비회원은 발행(published) 행만 (초안 노출 방지)
-- ---------------------------------------------------------------------------
drop policy if exists ph2_processed_news_anon_select on public.processed_news;
create policy ph2_processed_news_anon_select on public.processed_news
  for select
  to anon
  using (coalesce(published, false) = true);

-- ---------------------------------------------------------------------------
-- local_minihomes — 공개 스팟만
-- ---------------------------------------------------------------------------
drop policy if exists ph2_local_minihomes_anon_select on public.local_minihomes;
create policy ph2_local_minihomes_anon_select on public.local_minihomes
  for select
  to anon
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = local_minihomes.local_spot_id
        and coalesce(s.is_published, false) = true
    )
  );

-- ---------------------------------------------------------------------------
-- local_menus — 공개 스팟 메뉴만 (오너 미리보기는 기존 정책 유지)
-- ---------------------------------------------------------------------------
drop policy if exists ph2_local_menus_anon_select on public.local_menus;
create policy ph2_local_menus_anon_select on public.local_menus
  for select
  to anon
  using (
    exists (
      select 1
      from public.local_spots s
      where s.id = local_menus.local_spot_id
        and coalesce(s.is_published, false) = true
    )
  );
