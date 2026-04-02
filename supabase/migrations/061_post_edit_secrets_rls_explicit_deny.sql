-- Lint: RLS enabled but no policies — 의도는 «클라이언트(anon/authenticated) 차단»이나
-- 어드바이저는 명시 정책을 권장. 024 bot_actions 와 동일 패턴.
-- 실제 읽기/쓰기는 Next API 의 service_role 만 (RLS 우회).

comment on table public.post_edit_secrets is
  '게시글 수정·삭제용 비밀번호 해시. 브라우저(anon/authenticated)는 정책으로 명시 차단. service_role API만 사용.';

drop policy if exists post_edit_secrets_no_client_access on public.post_edit_secrets;
create policy post_edit_secrets_no_client_access on public.post_edit_secrets
  for all
  to anon, authenticated
  using (false)
  with check (false);
