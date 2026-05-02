-- =============================================================================
-- 135_biz_radar_expansion_enums.sql — korean_biz_category enum 확장만 수행
-- PG는 새 enum 값은 커밋된 뒤에만 INSERT 등에서 사용 가능하므로,
-- 반드시 별도 트랜잭션으로 먼저 실행할 것.
-- 실행 예:
--   npx supabase db query --linked -f supabase/seeds/135_biz_radar_expansion_enums.sql
-- =============================================================================

alter type public.korean_biz_category add value if not exists 'vehicle_rent';
alter type public.korean_biz_category add value if not exists 'golf';
alter type public.korean_biz_category add value if not exists 'massage_spa';
