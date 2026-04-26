-- RLS initplan: auth.uid() → (select auth.uid()) (Supabase 성능 린트)
-- ilchon_links_select + 동일 패턴의 ilchon_requests_select

drop policy if exists ilchon_links_select on public.ilchon_links;
create policy ilchon_links_select on public.ilchon_links
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists ilchon_requests_select on public.ilchon_requests;
create policy ilchon_requests_select on public.ilchon_requests
  for select
  to authenticated
  using (
    (select auth.uid()) = from_user_id
    or (select auth.uid()) = to_user_id
  );
