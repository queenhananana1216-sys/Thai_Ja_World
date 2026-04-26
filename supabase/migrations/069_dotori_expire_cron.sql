-- =============================================================================
-- 069_dotori_expire_cron.sql
-- 만료된 기간제 아이템 자동 해제 (pg_cron이 있을 때만)
-- Supabase hosted에서는 pg_cron이 기본 활성화
-- =============================================================================

-- 매일 03:00 UTC에 만료 아이템 정리 (pg_cron이 없으면 무시)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'dotori-expire-items',
      '0 3 * * *',
      'select public.dotori_expire_items()'
    );
  end if;
exception when others then
  raise notice 'pg_cron not available — skip cron schedule for dotori_expire_items';
end;
$$;
