-- =============================================================================
-- 021_set_push_subscriptions_updated_at_search_path
-- Lint 0011_function_search_path_mutable: public.set_push_subscriptions_updated_at
-- =============================================================================

create or replace function public.set_push_subscriptions_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
