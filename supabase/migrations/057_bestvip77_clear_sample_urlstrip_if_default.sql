-- 옛 시드(線路 A/B/C)만 있을 때 비우기 — 이미 링크를 바꾼 경우는 건너뜀
update public.bestvip77_site_settings
set content =
  jsonb_set(
    jsonb_set(content, '{urlStrip,items}', '[]'::jsonb, true),
    '{urlStrip,heading}',
    '"快捷入口"'::jsonb,
    true
  )
where id = 1
  and content->'urlStrip'->'items'->0->>'label' = '線路 A';

-- feed 메타 없으면 추가
update public.bestvip77_site_settings
set content =
  content
  || '{"feed":{"title":"合作商家","subtitle":"後台「광고 카드」可編輯圖片與文案。"}}'::jsonb
where id = 1
  and not (content ? 'feed');
