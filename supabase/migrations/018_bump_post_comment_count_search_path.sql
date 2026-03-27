-- =============================================================================
-- 018_bump_post_comment_count_search_path
-- Lint 0011_function_search_path_mutable: public.bump_post_comment_count
-- =============================================================================

create or replace function public.bump_post_comment_count()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
    set comment_count = public.posts.comment_count + 1
    where public.posts.id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts
    set comment_count = greatest(0, public.posts.comment_count - 1)
    where public.posts.id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;
