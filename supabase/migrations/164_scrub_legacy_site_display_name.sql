-- 옛 브랜드가 site_settings 에 남아 있으면 표시명을 현재 브랜드로 고정 (메타 title.template 등 전역 노출)

begin;

update public.site_settings
set
  value = to_jsonb('태국에, 살자'::text),
  updated_at = now()
where key = 'brand.site_display_name'
  and (
    value #>> '{}' ilike '%태자%'
    or lower(coalesce(value #>> '{}', '')) like '%taeja%'
    or lower(coalesce(value #>> '{}', '')) like '%thaija%'
  );

commit;
