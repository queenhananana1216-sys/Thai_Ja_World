-- ============================================================
-- 093_local_shop_template_asset_type_scene.sql
-- 로컬샵 템플릿 파이프라인 자산 타입 확장 (현장 분위기 사진)
-- ============================================================

alter table public.local_spot_menu_assets
  drop constraint if exists local_spot_menu_assets_asset_type_check;

alter table public.local_spot_menu_assets
  add constraint local_spot_menu_assets_asset_type_check
  check (asset_type in ('menu_board', 'price_list', 'treatment_sheet', 'shop_scene'));
