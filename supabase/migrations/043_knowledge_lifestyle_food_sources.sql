-- ============================================================
-- 043_knowledge_lifestyle_food_sources.sql
-- 생활·맛집·여행 톤 메타 수집용 url_list (bangkokpost.com = 기존 신뢰 도메인)
-- ============================================================

insert into public.knowledge_sources (name, kind, url_list_json, is_active)
select
  '태자월드 — 생활·맛집·여행(메타)'::text,
  'url_list'::text,
  jsonb_build_array(
    jsonb_build_object(
      'url', 'https://www.bangkokpost.com/life/travel',
      'label', 'Bangkok Post Travel·생활 — 태국 여행 맛집 정보'
    ),
    jsonb_build_object(
      'url', 'https://www.bangkokpost.com/travel/',
      'label', 'Bangkok Post Travel 섹션 — 태국 관광 생활'
    ),
    jsonb_build_object(
      'url', 'https://www.bangkokpost.com/life/',
      'label', 'Bangkok Post Life — 태국 현지 생활'
    )
  ),
  true
where not exists (
  select 1 from public.knowledge_sources k
  where k.kind = 'url_list' and k.name = '태자월드 — 생활·맛집·여행(메타)'
);
