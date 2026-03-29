-- 비회원도 뉴스·게시판 등에서 댓글 작성자 표시명(display_name)을 읽을 수 있게 함.
-- (anon 클라이언트가 profiles 일부 컬럼 SELECT 가능)

drop policy if exists profiles_select_public_display on public.profiles;
create policy profiles_select_public_display on public.profiles
  for select
  to anon, authenticated
  using (true);
