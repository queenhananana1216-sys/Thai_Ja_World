-- board_posts: JWT(authenticated) 직접 클라이언트·PostgREST 일관성용 권한 보강
-- (서버 API는 서비스 롤 INSERT를 사용하지만, 다른 경로 대비)
grant select on public.board_posts to authenticated;
grant insert, update, delete on public.board_posts to authenticated;

notify pgrst, 'reload_schema';
