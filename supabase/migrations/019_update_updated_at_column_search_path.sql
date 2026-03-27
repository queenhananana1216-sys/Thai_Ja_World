-- =============================================================================
-- 019_update_updated_at_column_search_path
-- Lint 0011_function_search_path_mutable: public.update_updated_at_column
-- (002_create_bot_policies 에서 정의된 updated_at 트리거 헬퍼)
-- =============================================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
