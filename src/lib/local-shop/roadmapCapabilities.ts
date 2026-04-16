/**
 * 로컬가게 권한·온보딩 확장 로드맵 (스키마는 미적용).
 * SQL 주석: supabase/migrations/090_future_local_shop_roles_roadmap.sql
 */
export const LOCAL_SHOP_ROADMAP = {
  midTerm: ['local_shop_applications', 'local_spots_owner_audit_log'] as const,
  longTerm: ['local_shop_staff_roles', 'rls_scope_owner_or_staff'] as const,
} as const;
